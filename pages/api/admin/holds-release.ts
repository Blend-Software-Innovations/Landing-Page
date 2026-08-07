import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { releaseHoldById } from "../../../lib/orders";
import { getPrisma } from "../../../lib/prisma";
import { writeOrderAudit } from "../../../lib/notifications";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { role, actor } = await resolveActor(req);
  if (!hasPermission(role, "inventory:write")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-holds-release:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;
  const { holdId } = req.body as { holdId?: string };
  if (!holdId) return res.status(400).json({ error: "Missing holdId" });

  // This endpoint exists to clear STRANDED holds — stock reserved by a checkout
  // that never became an order. Releasing a hold that still belongs to a live
  // order corrupts the count: the release puts the stock back, confirming the
  // order re-deducts it, and cancelling it later adds it a second time.
  //
  // Only a hold with no order, or one whose order is already finished, is safe
  // to release by hand. Anything else must go through the order's own status
  // change so inventory and status move together.
  const prisma = getPrisma() as any;
  const hold = await prisma.inventoryHold.findUnique({ where: { id: holdId }, include: { order: true } });
  if (!hold) return res.status(404).json({ error: "Hold not found" });
  if (hold.order && !["CANCELED", "RETURNED"].includes(hold.order.status)) {
    return res.status(409).json({
      error: `This hold belongs to order ${hold.order.id} (${hold.order.status}). Cancel the order instead — that releases the stock correctly.`
    });
  }

  const ok = await releaseHoldById(holdId);
  await writeOrderAudit({
    orderId: hold.order?.id || holdId,
    actor,
    role,
    action: "inventory.hold.release",
    data: { holdId, variantId: hold.variantId, quantity: hold.quantity }
  }).catch(() => undefined);
  return res.status(200).json({ status: ok ? "released" : "missing" });
}
