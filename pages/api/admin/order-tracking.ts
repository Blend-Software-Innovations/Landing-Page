import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { updateOrderTracking } from "../../../lib/orders";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await resolveActor(req);
  if (!hasPermission(session.role, "orders:write")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-order-tracking:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;
  const { orderId, trackingCode, shippingPartner } = req.body as {
    orderId?: string;
    trackingCode?: string;
    shippingPartner?: string;
  };
  if (!orderId || (!trackingCode && !shippingPartner)) {
    return res.status(400).json({ error: "Missing data" });
  }
  const order = await updateOrderTracking(orderId, trackingCode, shippingPartner, session);
  // null means the order does not exist — returning 200 {order:null} told the
  // panel the edit had succeeded.
  if (!order) return res.status(404).json({ error: "Order not found" });
  return res.status(200).json({ order });
}
