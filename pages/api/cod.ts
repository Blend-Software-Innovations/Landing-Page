import type { NextApiRequest, NextApiResponse } from "next";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { createOrder } from "../../lib/orders";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { detectFraud } from "../../lib/fraud";
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
  if (await isRateLimited(`cod:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const payload = req.body || {};

  // --- Idempotency: if client sent a key and we already processed it, return early ---
  const idempotencyKey = String(payload.idempotencyKey || "").trim() || null;
  if (idempotencyKey) {
    const prisma = getPrisma() as any;
    const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return res.status(200).json({ status: "ok", orderId: existing.id, idempotent: true });
    }
  }

  // Cap order creation per phone as well as per IP — IPs rotate, phones don't.
  const phoneKey = normalizePhone(String(payload.phone || ""));
  if (phoneKey && (await isRateLimited(`orders:phone:${phoneKey}`, 5, 60 * 60_000))) {
    return res.status(429).json({ error: "Too many orders from this phone. Please try again later." });
  }

  const otpToken = String(payload.otpToken || "");
  const config = await getConfig();
  if (config.features?.otpEnabled) {
    const normalizedPhone = normalizePhone(String(payload.phone || ""));
    if (!otpToken || !(await validateOtpToken(otpToken, normalizedPhone))) {
      return res.status(401).json({ error: "OTP verification required" });
    }
  }

  // --- Fraud check BEFORE reserving inventory ---
  const fraud = await detectFraud({
    phone: payload.phone || "",
    deviceFingerprint: payload.deviceFingerprint || "",
    transactionId: payload.transactionId || ""
  });
  if (fraud.flags.includes("txn_duplicate")) {
    return res.status(409).json({ error: "Duplicate transaction ID" });
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
    district: String(payload.district || ""),
    thana: String(payload.thana || ""),
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
      // Release anything already held for earlier lines, otherwise a deleted
      // variant mid-cart pinned real stock for the full hold TTL.
      for (const id of reservationIds) {
        await releaseInventory(id);
      }
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
  const order = await createOrder({
    customerName: payload.name || "",
    phone: payload.phone || "",
    address: payload.address || "",
    city: payload.city || "",
    area: payload.area || "",
    deliveryArea: deliveryArea || undefined,
    deliverySlot: deliverySlot || undefined,
    total: amounts.total,
    paymentMethod: "COD",
    paymentStatus: "UNPAID",
    transactionId: payload.transactionId || undefined,
    idempotencyKey: idempotencyKey || undefined,
    shippingPartner: payload.shippingPartner || undefined,
    deviceFingerprint: payload.deviceFingerprint || undefined,
    fraudFlags: fraud.flags,
    fraudScore: fraud.score,
    utm: payload.utm || undefined,
    productId: payload.productId || "",
    variantId: payload.variantId || "",
    quantity: items[0]?.quantity ?? 1,
    unitPrice: items[0]?.unitPrice ?? 0,
    reservationIds,
    items: resolvedItems,
    status: "PENDING"
  });
  return res.status(200).json({ status: "ok", orderId: order.id });
}
