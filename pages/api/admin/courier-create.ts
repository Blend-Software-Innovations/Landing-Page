import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";
import { createCourierShipment } from "../../../lib/couriers";
import { writeOrderAudit } from "../../../lib/notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // resolveActor rather than resolveRole: a booking that charges a customer must
  // be attributable to a person, not just to "admin".
  const { role, actor } = await resolveActor(req);
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

  // Already booked — a courier consignment is real-world irreversible, and the
  // previous code overwrote the tracking code, orphaning the first shipment
  // while a second parcel went out and a second COD was collected.
  if (order.trackingCode) {
    return res.status(409).json({
      error: "This order already has a consignment",
      trackingCode: order.trackingCode,
      shippingPartner: order.shippingPartner
    });
  }
  // Booking a cancelled or already-delivered order is always a mistake.
  if (!["CONFIRMED", "PACKED", "PENDING"].includes(order.status)) {
    return res.status(409).json({ error: `Cannot book a courier for a ${order.status} order` });
  }

  // Claim the order BEFORE calling the courier. updateMany with the null guard
  // is atomic, so two concurrent clicks cannot both proceed — the loser gets 0
  // rows and stops. The placeholder is replaced with the real code below.
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, trackingCode: null },
    data: { trackingCode: `PENDING:${orderId}`, shippingPartner: partner }
  });
  if (claimed.count === 0) {
    return res.status(409).json({ error: "This order is already being booked" });
  }

  try {
    const result = await createCourierShipment(partner, order);
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { shippingPartner: partner, trackingCode: result.trackingCode }
    });
    await writeOrderAudit({
      orderId,
      actor,
      role,
      action: "courier.create",
      data: { partner, trackingCode: result.trackingCode, consignmentId: result.consignmentId || "" }
    });
    return res.status(200).json({ order: updated, trackingCode: result.trackingCode, labelUrl: result.labelUrl });
  } catch (error: any) {
    // Release the claim so a fixed address or a restored API key can be retried.
    // Left in place, a transient courier outage would permanently block the
    // order from ever being booked.
    await prisma.order
      .updateMany({ where: { id: orderId, trackingCode: `PENDING:${orderId}` }, data: { trackingCode: null } })
      .catch(() => undefined);
    await writeOrderAudit({
      orderId,
      actor,
      role,
      action: "courier.create.failed",
      data: { partner, error: String(error?.message || "").slice(0, 300) }
    }).catch(() => undefined);
    return res.status(400).json({ error: error?.message || "Courier API failed" });
  }
}
