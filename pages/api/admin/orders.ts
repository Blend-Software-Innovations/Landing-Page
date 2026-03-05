import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { listOrders } from "../../../lib/orders";
import { getPrisma } from "../../../lib/prisma";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-orders:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  const limit = Number(req.query.limit || 50);
  const paymentMethod = req.query.paymentMethod ? String(req.query.paymentMethod) : "";
  const manualStatus = req.query.manualStatus ? String(req.query.manualStatus) : "";
  if (paymentMethod || manualStatus) {
    const prisma = getPrisma() as any;
    const where: Record<string, any> = {};
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (manualStatus) where.manualStatus = manualStatus;
    const orders = await prisma.order.findMany({
      take: Number.isFinite(limit) ? Math.min(limit, 100) : 50,
      orderBy: { createdAt: "desc" },
      where,
      include: { items: true }
    });
    return res.status(200).json({ orders });
  }
  const orders = await listOrders(Number.isFinite(limit) ? limit : 50);
  return res.status(200).json({ orders });
}
