import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import fs from "fs";
import path from "path";
import { uploadImage } from "../../lib/uploads";
import { reserveInventory, releaseInventory } from "../../lib/inventory";
import { createOrder } from "../../lib/orders";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited } from "../../lib/rateLimit";

export const config = {
  api: { bodyParser: false }
};

const dataPath = path.join(process.cwd(), "data", "manual-payments.jsonl");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`payment-proof:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const form = formidable({
    multiples: false,
    uploadDir: os.tmpdir(),
    keepExtensions: true,
    maxFileSize: 6 * 1024 * 1024
  });

  form.parse(req, async (err: unknown, fields: Record<string, any>, files: Record<string, any>) => {
    if (err) return res.status(400).json({ error: "Invalid upload" });
    const proofFile = files.paymentProof as any;
    const file = Array.isArray(proofFile) ? proofFile[0] : proofFile;
    if (!file) return res.status(400).json({ error: "Missing file" });

    try {
      const payloadRaw = String(fields.payload || "{}");
      const payload = JSON.parse(payloadRaw);
      const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
      const items = itemsRaw.length
        ? itemsRaw.map((item: any) => ({
            productId: String(item.productId || ""),
            variantId: String(item.variantId || ""),
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 1)
          }))
        : [
            {
              productId: String(payload.productId || ""),
              variantId: String(payload.variantId || ""),
              quantity: Number(payload.quantity || 1),
              unitPrice: Math.round(Number(payload.total || 0) / Math.max(1, Number(payload.quantity || 1))),
              lineTotal: Number(payload.total || 0)
            }
          ];

      const reservationIds: string[] = [];
      for (const item of items) {
        if (!item.variantId) continue;
        const reservationId = await reserveInventory(item.variantId, item.quantity);
        if (!reservationId) {
          for (const id of reservationIds) {
            await releaseInventory(id);
          }
          return res.status(409).json({ error: "Insufficient stock" });
        }
        reservationIds.push(reservationId);
      }
      const upload = await uploadImage(file.filepath, file.originalFilename || "payment-proof.jpg", "public");
      const record = { ...payload, reservationIds, proofUrl: upload.url, createdAt: new Date().toISOString() };
      await createOrder({
        customerName: payload.name || "",
        phone: payload.phone || "",
        address: payload.address || "",
        city: payload.city || "",
        area: payload.area || "",
        total: Number(payload.total || 0),
        paymentMethod: "MANUAL",
        paymentStatus: "PARTIAL",
        transactionId: payload.transactionId || undefined,
        productId: payload.productId || "",
        variantId: payload.variantId || "",
        quantity: Number(payload.quantity || 1),
        unitPrice: Math.round(Number(payload.total || 0) / Math.max(1, Number(payload.quantity || 1))),
        reservationIds,
        items,
        status: "PENDING"
      });
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.appendFileSync(dataPath, `${JSON.stringify(record)}\n`);
      return res.status(200).json({ status: "ok", url: upload.url });
    } catch (uploadError) {
      console.error("Payment proof upload failed", uploadError);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
