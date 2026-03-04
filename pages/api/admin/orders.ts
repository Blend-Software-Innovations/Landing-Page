import type { NextApiRequest, NextApiResponse } from "next";
import { canRead, resolveRole } from "../../../lib/adminAuth";
import { listOrders } from "../../../lib/orders";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!canRead(role)) return res.status(401).json({ error: "Unauthorized" });
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
  const orders = await listOrders(Number.isFinite(limit) ? limit : 50);
  return res.status(200).json({ orders });
}
