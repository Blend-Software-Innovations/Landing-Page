import { logger } from "../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";
import { priceItems, computeOrderAmounts } from "../../lib/pricing";
import { signReservationIds } from "../../lib/reservationSig";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" }) : null;

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

  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  const body = req.body as Record<string, unknown>;
  const ip = getClientIp(req);
  if (await isRateLimited(`checkout:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  const quantity = Number(body.quantity || 1);
  const variantId = String(body.variantId || "");
  const productId = String(body.productId || "");
  const name = String(body.name || "");
  const email = String(body.email || "");
  const phone = String(body.phone || "");
  const otpToken = String(body.otpToken || "");
  const deviceFingerprint = String(body.deviceFingerprint || "");
  const itemsRaw = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
  const shippingPartner = String(body.shippingPartner || "");

  // Cap order creation per phone as well as per IP — IPs rotate, phones don't.
  const phoneKey = normalizePhone(phone);
  if (phoneKey && (await isRateLimited(`orders:phone:${phoneKey}`, 5, 60 * 60_000))) {
    return res.status(429).json({ error: "Too many orders from this phone. Please try again later." });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (req.headers.origin ? String(req.headers.origin) : "http://localhost:3000");

  try {
    const config = await getConfig();
    if (config.features?.otpEnabled) {
      const normalizedPhone = normalizePhone(phone);
      if (!otpToken || !(await validateOtpToken(otpToken, normalizedPhone))) {
        return res.status(401).json({ error: "OTP verification required" });
      }
    }
    // Server-side pricing — client-sent unitPrice/total/fees are ignored.
    const items = await priceItems(config, itemsRaw, {
      productId,
      variantId,
      quantity,
      optionValues: body.selectedOptions
    });
    const deliveryArea = String(body.deliveryArea || "");
    const deliverySlot = String(body.deliverySlot || "");
    const deliveryZone = String(body.deliveryZone || "");
    const amounts = computeOrderAmounts(config, items, {
      deliveryArea,
      deliveryZone,
      district: String(body.district || ""),
      thana: String(body.thana || ""),
      giftWrap: Boolean(body.giftWrap)
    });

    // --- Minimum order value (area-specific or global) ---
    const areaCfg = config.deliveryAreas?.find((a) => a.name === deliveryArea);
    const minOrder = areaCfg?.minOrder ?? config.minOrderValue ?? 0;
    if (minOrder > 0 && amounts.goodsSubtotal < minOrder) {
      return res.status(400).json({ error: `Minimum order is ${minOrder} for ${deliveryArea || "this area"}` });
    }

    const reservationIds: string[] = [];
    for (const item of items) {
      if (!item.variantId) continue;
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
    }

    const discountCents = Math.max(0, Math.round(amounts.discount * 100));
    const lineItems = items.map((item, index) => {
      let unitAmount = Math.max(1, Math.round(item.unitPrice * 100));
      if (index === 0 && discountCents > 0) {
        const perUnitDiscount = Math.floor(discountCents / Math.max(1, item.quantity));
        unitAmount = Math.max(1, unitAmount - perUnitDiscount);
      }
      return {
        price_data: {
          currency: "bdt",
          product_data: {
            name: item.name,
            description: "Handmade product purchase"
          },
          unit_amount: unitAmount
        },
        quantity: item.quantity
      };
    });

    if (amounts.giftWrapFee > 0) {
      lineItems.push({
        price_data: {
          currency: "bdt",
          product_data: { name: "Gift wrap", description: "Gift-ready packaging" },
          unit_amount: Math.max(1, Math.round(amounts.giftWrapFee * 100))
        },
        quantity: 1
      });
    }

    if (amounts.shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: "bdt",
          product_data: { name: "Shipping", description: "Delivery fee" },
          unit_amount: Math.max(1, Math.round(amounts.shippingFee * 100))
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: email || undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&reservation_ids=${reservationIds.join(",")}&rsig=${signReservationIds(reservationIds)}`,
      cancel_url: `${origin}/cancel?reservation_ids=${reservationIds.join(",")}&rsig=${signReservationIds(reservationIds)}`,
      metadata: {
        name,
        email,
        phone,
        reservationIds: reservationIds.join(","),
        productId,
        variantId,
        unitPrice: String(items[0]?.unitPrice ?? 0),
        address: String(body.address || ""),
        city: String(body.city || ""),
        area: String(body.area || ""),
        deliveryArea,
        deliverySlot,
        note: String(body.note || ""),
        quantity: String(quantity),
        giftWrap: String(body.giftWrap || false),
        deliveryZone: String(body.deliveryZone || ""),
        deviceFingerprint,
        shippingPartner,
        utm: JSON.stringify(body.utm || {}),
        selectedOptions: JSON.stringify(body.selectedOptions || {}),
        cart: JSON.stringify(
          items.map((item) => ({
            name: item.name,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        ),
        discount: String(amounts.discount || 0),
        giftWrapFee: String(amounts.giftWrapFee || 0),
        shippingFee: String(amounts.shippingFee || 0)
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    logger.error({ err: error }, "Stripe checkout error");
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
