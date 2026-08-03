import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";
import { createCourierShipment } from "../../../lib/couriers";
import { writeOrderAudit } from "../../../lib/notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:write")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-courier-create:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const { orderId, partner } = req.body as { orderId?: string; partner?: string };
  if (!orderId || !partner) return res.status(400).json({ error: "Missing data" });

  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  try {
    const result = await createCourierShipment(partner, order);
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingPartner: partner,
        trackingCode: result.trackingCode || order.trackingCode
      }
    });
    await writeOrderAudit({
      orderId,
      role,
      action: "courier.create",
      data: { partner, trackingCode: result.trackingCode || "" }
    });
    return res.status(200).json({ order: updated, trackingCode: result.trackingCode, labelUrl: result.labelUrl });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || "Courier API failed" });
  }
}
