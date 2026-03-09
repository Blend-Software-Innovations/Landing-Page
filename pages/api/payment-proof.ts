import { logger } from "../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import os from "os";
import fs from "fs";
import path from "path";
import { uploadImage } from "../../lib/uploads";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { createOrder, updateOrderStatus } from "../../lib/orders";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited } from "../../lib/rateLimit";
import { notifyManualPaymentReview, writeOrderAudit } from "../../lib/notifications";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { detectFraud } from "../../lib/fraud";

export const config = {
  api: { bodyParser: false }
};

const dataPath = path.join(process.cwd(), "data", "manual-payments.jsonl");

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("8801")) return `+${digits}`;
  if (digits.startsWith("01")) return `+88${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  return input;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`payment-proof:${ip}`, publicRateLimitPerMin, 60_000)) {
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
      const config = await getConfig();
      if (config.features?.otpEnabled) {
        const normalizedPhone = normalizePhone(String(payload.phone || ""));
        const otpToken = String(payload.otpToken || "");
        if (!otpToken || !validateOtpToken(otpToken, normalizedPhone)) {
          return res.status(401).json({ error: "OTP verification required" });
        }
      }
      const txnId = String(payload.transactionId || "").trim();
      const paidAmount = Number(payload.paidAmount || 0);
      const total = Number(payload.total || 0);
      const txnRegex = /^[A-Z0-9]{8,20}$/i;
      if (!txnId || !txnRegex.test(txnId)) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }
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
      const resolvedItems = [];
      for (const item of items) {
        if (!item.variantId) {
          resolvedItems.push(item);
          continue;
        }
        const resolvedId = await resolveInventoryVariantId(item.variantId);
        if (!resolvedId) {
          return res.status(409).json({ error: "Insufficient stock" });
        }
        const reservationId = await reserveInventory(resolvedId, item.quantity);
        if (!reservationId) {
          for (const id of reservationIds) {
            await releaseInventory(id);
          }
          return res.status(409).json({ error: "Insufficient stock" });
        }
        reservationIds.push(reservationId);
        resolvedItems.push({ ...item, variantId: resolvedId });
      }
      const upload = await uploadImage(file.filepath, file.originalFilename || "payment-proof.jpg", "public");
      const record = { ...payload, reservationIds, proofUrl: upload.url, createdAt: new Date().toISOString() };
      const fraud = await detectFraud({
        phone: payload.phone || "",
        deviceFingerprint: payload.deviceFingerprint || "",
        transactionId: txnId
      });
      const duplicateTxn = fraud.flags.includes("txn_duplicate");
      const amountMatch = paidAmount > 0 && total > 0 && paidAmount === total;
      const manualStatus = duplicateTxn ? "REJECTED" : amountMatch ? "VERIFIED" : "PENDING";
      const manualReviewedAt = manualStatus === "PENDING" ? null : new Date().toISOString();
      const manualReviewNote = duplicateTxn
        ? "Duplicate transaction ID"
        : amountMatch
        ? "Auto-verified by amount match"
        : null;
      const paymentStatus = manualStatus === "VERIFIED" ? "PAID" : manualStatus === "REJECTED" ? "UNPAID" : "PARTIAL";
      const order = await createOrder({
        customerName: payload.name || "",
        phone: payload.phone || "",
        address: payload.address || "",
        city: payload.city || "",
        area: payload.area || "",
        total,
        paymentMethod: "MANUAL",
        paymentStatus,
        transactionId: txnId || undefined,
        shippingPartner: payload.shippingPartner || undefined,
        manualStatus,
        manualProofUrl: upload.url,
        manualSubmittedAt: new Date().toISOString(),
        manualReviewedAt: manualReviewedAt || undefined,
        manualReviewNote: manualReviewNote || undefined,
        productId: payload.productId || "",
        variantId: payload.variantId || "",
        quantity: Number(payload.quantity || 1),
        unitPrice: Math.round(total / Math.max(1, Number(payload.quantity || 1))),
        reservationIds,
        items: resolvedItems,
        status: "PENDING",
        deviceFingerprint: payload.deviceFingerprint || undefined,
        fraudFlags: fraud.flags,
        fraudScore: fraud.score,
        paidAmount: paidAmount || undefined
      });
      if (manualStatus === "VERIFIED") {
        await updateOrderStatus(order.id, "CONFIRMED", { role: "system" as any });
      }
      if (manualStatus === "REJECTED") {
        await updateOrderStatus(order.id, "CANCELED", { role: "system" as any });
      }
      if (manualStatus === "VERIFIED" || manualStatus === "REJECTED") {
        await notifyManualPaymentReview(order, manualStatus as "VERIFIED" | "REJECTED");
      }
      await writeOrderAudit({
        orderId: order.id,
        action: "payment.manual.submitted",
        data: { transactionId: txnId, proofUrl: upload.url, manualStatus }
      });
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      fs.appendFileSync(dataPath, `${JSON.stringify(record)}\n`);
      return res.status(200).json({ status: "ok", url: upload.url });
    } catch (uploadError) {
      logger.error({ err: uploadError }, "Payment proof upload failed");
      return res.status(500).json({ error: "Upload failed" });
    }
  });
}
