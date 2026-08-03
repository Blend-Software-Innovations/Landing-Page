import type { NextApiRequest, NextApiResponse } from "next";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { createOrder } from "../../lib/orders";
import { detectFraud } from "../../lib/fraud";
import { buildPaymentLink } from "../../lib/paymentLinks";
import { writeOrderAudit } from "../../lib/notifications";
import { getPrisma } from "../../lib/prisma";
import { priceItems, computeOrderAmounts } from "../../lib/pricing";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("8801")) return `+${digits}`;
  if (digits.startsWith("01")) return `+88${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  return input;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = getClientIp(req);
  if (await isRateLimited(`payment-link:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const payload = req.body || {};

  // --- Idempotency: a retried request must not create a second order + reservations ---
  const idempotencyKey = String(payload.idempotencyKey || "").trim() || null;
  if (idempotencyKey) {
    const prisma = getPrisma() as any;
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return res.status(200).json({ url: existing.paymentLink || null, orderId: existing.id, idempotent: true });
    }
  }

  // Cap order creation per phone as well as per IP — IPs rotate, phones don't.
  const phoneKey = normalizePhone(String(payload.phone || ""));
  if (phoneKey && (await isRateLimited(`orders:phone:${phoneKey}`, 5, 60 * 60_000))) {
    return res.status(429).json({ error: "Too many orders from this phone. Please try again later." });
  }

  const config = await getConfig();
  if (config.features?.otpEnabled) {
    const normalizedPhone = normalizePhone(String(payload.phone || ""));
    const otpToken = String(payload.otpToken || "");
    if (!otpToken || !(await validateOtpToken(otpToken, normalizedPhone))) {
      return res.status(401).json({ error: "OTP verification required" });
    }
  }

  const provider = String(payload.paymentMethod || "").toLowerCase();
  if (!["bkash", "nagad", "rocket"].includes(provider)) {
    return res.status(400).json({ error: "Invalid payment provider" });
  }
  if (!config.paymentProviders?.[provider as "bkash" | "nagad" | "rocket"]) {
    return res.status(400).json({ error: "Payment provider is disabled" });
  }
  // Bail out BEFORE reserving inventory and creating the order. This check used
  // to run only after createOrder, so enabling a provider whose link was never
  // configured left an orphaned order holding real stock for 72h and showed the
  // buyer an error at the final step.
  if (!config.paymentLinks?.[provider as "bkash" | "nagad" | "rocket"]) {
    return res.status(400).json({ error: "Payment link not configured" });
  }

  // Server-side pricing — client-sent unitPrice/total/fees are ignored.
  const items = await priceItems(config, payload.items, {
    productId: payload.productId,
    variantId: payload.variantId,
    quantity: payload.quantity,
    optionValues: payload.selectedOptions
  });
  const deliveryArea = String(payload.deliveryArea || "");
  const deliverySlot = String(payload.deliverySlot || "");
  const amounts = computeOrderAmounts(config, items, {
    deliveryArea,
    deliveryZone: String(payload.deliveryZone || ""),
    giftWrap: Boolean(payload.giftWrap)
  });

  // --- Minimum order value (area-specific or global) ---
  const areaCfg = config.deliveryAreas?.find((a) => a.name === deliveryArea);
  const minOrder = areaCfg?.minOrder ?? config.minOrderValue ?? 0;
  if (minOrder > 0 && amounts.goodsSubtotal < minOrder) {
    return res.status(400).json({ error: `Minimum order is ${minOrder} for ${deliveryArea || "this area"}` });
  }

  const reservationIds: string[] = [];
  const resolvedItems = [];
  for (const item of items) {
    if (!item.variantId) {
      resolvedItems.push(item);
      continue;
    }
    const resolvedId = await resolveInventoryVariantId(item.variantId);
    if (!resolvedId) {
      return res.status(409).json({ error: "Insufficient stock" });
    }
    const reservationId = await reserveInventory(resolvedId, item.quantity);
    if (!reservationId) {
      for (const id of reservationIds) {
        await releaseInventory(id);
      }
      return res.status(409).json({ error: "Insufficient stock" });
    }
    reservationIds.push(reservationId);
    resolvedItems.push({ ...item, variantId: resolvedId });
  }

  const fraud = await detectFraud({
    phone: String(payload.phone || ""),
    deviceFingerprint: String(payload.deviceFingerprint || "")
  });

  const order = await createOrder({
    customerName: payload.name || "",
    phone: payload.phone || "",
    address: payload.address || "",
    city: payload.city || "",
    area: payload.area || "",
    total: amounts.total,
    paymentMethod: provider.toUpperCase(),
    paymentStatus: "UNPAID",
    idempotencyKey: idempotencyKey || undefined,
    deliveryArea: deliveryArea || undefined,
    deliverySlot: deliverySlot || undefined,
    productId: payload.productId || "",
    variantId: payload.variantId || "",
    quantity: items[0]?.quantity ?? 1,
    unitPrice: items[0]?.unitPrice ?? 0,
    reservationIds,
    items: resolvedItems,
    deviceFingerprint: payload.deviceFingerprint || "",
    fraudFlags: fraud.flags,
    fraudScore: fraud.score,
    paymentProvider: provider.toUpperCase(),
    utm: payload.utm || undefined
  });

  const link = buildPaymentLink(
    provider as any,
    { orderId: order.id, amount: order.total, phone: order.phone },
    config
  );
  if (!link) {
    return res.status(400).json({ error: "Payment link not configured" });
  }

  const prisma = getPrisma() as any;
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentLink: link }
  });
  await writeOrderAudit({
    orderId: order.id,
    action: "payment.link.created",
    data: { provider, link }
  });

  return res.status(200).json({ url: link });
}
