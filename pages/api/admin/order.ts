import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { getPrisma } from "../../../lib/prisma";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-order:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ error: "Missing id" });
  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  return res.status(200).json({ order });
}
