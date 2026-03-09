import type { NextApiRequest, NextApiResponse } from "next";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited } from "../../lib/rateLimit";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { createOrder } from "../../lib/orders";
import { detectFraud } from "../../lib/fraud";
import { buildPaymentLink } from "../../lib/paymentLinks";
import { writeOrderAudit } from "../../lib/notifications";
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
  if (await isRateLimited(`payment-link:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const payload = req.body || {};
  const config = await getConfig();
  if (config.features?.otpEnabled) {
    const normalizedPhone = normalizePhone(String(payload.phone || ""));
    const otpToken = String(payload.otpToken || "");
    if (!otpToken || !validateOtpToken(otpToken, normalizedPhone)) {
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
    total: Number(payload.total || 0),
    paymentMethod: provider.toUpperCase(),
    paymentStatus: "UNPAID",
    productId: payload.productId || "",
    variantId: payload.variantId || "",
    quantity: Number(payload.quantity || 1),
    unitPrice: Math.round(Number(payload.total || 0) / Math.max(1, Number(payload.quantity || 1))),
    reservationIds,
    items: resolvedItems,
    deviceFingerprint: payload.deviceFingerprint || "",
    fraudFlags: fraud.flags,
    fraudScore: fraud.score,
    paymentProvider: provider.toUpperCase()
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
