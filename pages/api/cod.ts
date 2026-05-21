import type { NextApiRequest, NextApiResponse } from "next";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited } from "../../lib/rateLimit";
import { createOrder } from "../../lib/orders";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { detectFraud } from "../../lib/fraud";
import { getPrisma } from "../../lib/prisma";


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
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
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

  const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
  const items = itemsRaw.length
    ? itemsRaw.map((item: any) => ({
        productId: String(item.productId || ""),
        variantId: String(item.variantId || ""),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 1)
      }))
    : [
        {
          productId: String(payload.productId || ""),
          variantId: String(payload.variantId || ""),
          quantity: Number(payload.quantity || 1),
          unitPrice: Math.round(Number(payload.total || 0) / Math.max(1, Number(payload.quantity || 1))),
          lineTotal: Number(payload.total || 0)
        }
      ];

  // --- Minimum order value (area-specific or global) ---
  const deliveryArea = String(payload.deliveryArea || "");
  const deliverySlot = String(payload.deliverySlot || "");
  const areaCfg = config.deliveryAreas?.find((a) => a.name === deliveryArea);
  const minOrder = areaCfg?.minOrder ?? config.minOrderValue ?? 0;
  const goodsSubtotal = items.reduce(
    (sum: number, it: any) => sum + Number(it.unitPrice || 0) * Number(it.quantity || 0),
    0
  );
  if (minOrder > 0 && goodsSubtotal < minOrder) {
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
  const order = await createOrder({
    customerName: payload.name || "",
    phone: payload.phone || "",
    address: payload.address || "",
    city: payload.city || "",
    area: payload.area || "",
    deliveryArea: deliveryArea || undefined,
    deliverySlot: deliverySlot || undefined,
    total: Number(payload.total || 0),
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
    quantity: Number(payload.quantity || 1),
    unitPrice: Math.round(Number(payload.total || 0) / Math.max(1, Number(payload.quantity || 1))),
    reservationIds,
    items: resolvedItems,
    status: "PENDING"
  });
  return res.status(200).json({ status: "ok", orderId: order.id });
}
