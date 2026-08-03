import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";
import { notifyManualPaymentReview, writeOrderAudit } from "../../../lib/notifications";
import { updateOrderStatus } from "../../../lib/orders";

const allowedStatuses = new Set(["PENDING", "VERIFIED", "REJECTED"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-manual-review:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }
  if (!hasPermission(role, "orders:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const body = req.body as { orderId?: string; status?: string; note?: string };
  const orderId = String(body.orderId || "");
  const status = String(body.status || "");
  if (!orderId || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const prisma = getPrisma() as any;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.paymentMethod !== "MANUAL") {
    return res.status(400).json({ error: "Not a manual payment order" });
  }

  const nextPaymentStatus = status === "VERIFIED" ? "PAID" : status === "REJECTED" ? "UNPAID" : order.paymentStatus;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      manualStatus: status,
      manualReviewedAt: status === "PENDING" ? null : new Date(),
      manualReviewNote: body.note ? String(body.note).slice(0, 200) : null,
      paymentStatus: nextPaymentStatus
    }
  });

  if (status === "VERIFIED") {
    await updateOrderStatus(orderId, "CONFIRMED", { role });
  }
  if (status === "REJECTED") {
    await updateOrderStatus(orderId, "CANCELED", { role });
  }
  if (status === "VERIFIED" || status === "REJECTED") {
    await notifyManualPaymentReview(updated, status);
  }

  await writeOrderAudit({
    orderId,
    actor: undefined,
    role,
    action: "payment.manual.review",
    data: {
      status,
      note: body.note || "",
      paymentStatus: nextPaymentStatus
    }
  });

  return res.status(200).json({ status: "ok", order: updated });
}
