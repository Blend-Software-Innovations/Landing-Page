import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { updateOrderStatus } from "../../../lib/orders";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await resolveActor(req);
  if (!hasPermission(session.role, "orders:write") && !hasPermission(session.role, "orders:pack")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-order-status:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;
  const { orderId, status } = req.body as { orderId?: string; status?: string };
  if (!orderId || !status) return res.status(400).json({ error: "Missing data" });
  if (session.role === "staff" && status !== "PACKED") {
    return res.status(403).json({ error: "Staff can only mark Packed" });
  }
  const updated = await updateOrderStatus(orderId, status as any, session);
  if (!updated) return res.status(400).json({ error: "Invalid status transition" });
  return res.status(200).json({ order: updated });
}
