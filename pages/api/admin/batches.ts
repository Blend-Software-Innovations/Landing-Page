import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { requireCsrf } from "../../../lib/csrf";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";

const EXPIRING_SOON_DAYS = 14;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`admin-batches:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!requireDb(res)) return;
  const prisma = getPrisma() as any;

  // ----- List batches (optionally for one variant), with expiring-soon flag -----
  if (req.method === "GET") {
    if (!hasPermission(role, "inventory:read")) return res.status(401).json({ error: "Unauthorized" });
    const variantId = String(req.query.variantId || "");
    const batches: any[] = await prisma.batch.findMany({
      where: variantId ? { variantId } : {},
      orderBy: [{ expiryDate: { sort: "asc", nulls: "last" } }, { receivedDate: "asc" }],
      take: 500,
      include: { variant: { select: { sku: true, name: true } } }
    });
    const soonThreshold = Date.now() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;
    const rows = batches.map((b) => ({
      ...b,
      expiringSoon: b.expiryDate ? new Date(b.expiryDate).getTime() <= soonThreshold : false
    }));
    return res.status(200).json({ batches: rows });
  }

  // ----- Add a batch (increments the variant's available stock) -----
  if (req.method === "POST") {
    if (!hasPermission(role, "inventory:write")) return res.status(401).json({ error: "Unauthorized" });
    if (!requireCsrf(req, res)) return;
    const body = (req.body || {}) as Record<string, unknown>;
    const variantId = String(body.variantId || "");
    const batchNo = String(body.batchNo || "").trim();
    const quantity = Math.floor(Number(body.quantity || 0));
    const expiryDate = body.expiryDate ? new Date(String(body.expiryDate)) : null;
    if (!variantId || !batchNo || quantity <= 0) {
      return res.status(400).json({ error: "variantId, batchNo and a positive quantity are required" });
    }
    const variant = await prisma.variant.findUnique({ where: { id: variantId } });
    if (!variant) return res.status(404).json({ error: "Variant not found" });
    try {
      const batch = await prisma.$transaction(async (tx: any) => {
        const created = await tx.batch.create({ data: { variantId, batchNo, quantity, expiryDate } });
        await tx.variant.update({ where: { id: variantId }, data: { stockQty: { increment: quantity } } });
        return created;
      });
      return res.status(200).json({ batch });
    } catch (err: any) {
      if (err?.code === "P2002") return res.status(409).json({ error: "Batch number already exists for this variant" });
      throw err;
    }
  }

  // ----- Delete a batch (reduces available stock by its remaining quantity) -----
  if (req.method === "DELETE") {
    if (!hasPermission(role, "inventory:write")) return res.status(401).json({ error: "Unauthorized" });
    if (!requireCsrf(req, res)) return;
    const id = String((req.body as any)?.id || req.query.id || "");
    if (!id) return res.status(400).json({ error: "Batch id required" });
    const batch = await prisma.batch.findUnique({ where: { id } });
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    await prisma.$transaction(async (tx: any) => {
      await tx.variant.update({ where: { id: batch.variantId }, data: { stockQty: { decrement: batch.quantity } } });
      await tx.batch.delete({ where: { id } });
    });
    return res.status(200).json({ status: "ok" });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
