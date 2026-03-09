import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { reserveInventory, releaseInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { publicRateLimitPerMin } from "../../lib/env";
import { isRateLimited } from "../../lib/rateLimit";
import { getConfig } from "../../lib/siteConfig.server";
import { validateOtpToken } from "../../lib/otp";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" }) : null;

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
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`checkout:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  const total = Number(body.total || 0);
  const quantity = Number(body.quantity || 1);
  const variantId = String(body.variantId || "");
  const productId = String(body.productId || "");
  const name = String(body.name || "");
  const email = String(body.email || "");
  const phone = String(body.phone || "");
  const otpToken = String(body.otpToken || "");
  const deviceFingerprint = String(body.deviceFingerprint || "");
  const giftWrapFee = Number(body.giftWrapFee || 0);
  const shippingFee = Number(body.shippingFee || 0);
  const discount = Number(body.discount || 0);
  const itemsRaw = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
  const shippingPartner = String(body.shippingPartner || "");

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (req.headers.origin ? String(req.headers.origin) : "http://localhost:3000");

  try {
    const config = await getConfig();
    if (config.features?.otpEnabled) {
      const normalizedPhone = normalizePhone(phone);
      if (!otpToken || !validateOtpToken(otpToken, normalizedPhone)) {
        return res.status(401).json({ error: "OTP verification required" });
      }
    }
    const items = itemsRaw.length
      ? itemsRaw.map((item) => ({
          name: String(item.name || "Custom item"),
          productId: String(item.productId || ""),
          variantId: String(item.variantId || ""),
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0)
        }))
      : [
          {
            name: "Custom Order",
            productId,
            variantId,
            quantity,
            unitPrice: Number(body.unitPrice || Math.max(0, total))
          }
        ];

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

    const discountCents = Math.max(0, Math.round(discount * 100));
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

    if (giftWrapFee > 0) {
      lineItems.push({
        price_data: {
          currency: "bdt",
          product_data: { name: "Gift wrap", description: "Gift-ready packaging" },
          unit_amount: Math.max(1, Math.round(giftWrapFee * 100))
        },
        quantity: 1
      });
    }

    if (shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: "bdt",
          product_data: { name: "Shipping", description: "Delivery fee" },
          unit_amount: Math.max(1, Math.round(shippingFee * 100))
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: email || undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&reservation_ids=${reservationIds.join(",")}`,
      cancel_url: `${origin}/cancel?reservation_ids=${reservationIds.join(",")}`,
      metadata: {
        name,
        email,
        phone,
        reservationIds: reservationIds.join(","),
        productId,
        variantId,
        unitPrice: String(Math.round(total / Math.max(1, quantity))),
        address: String(body.address || ""),
        city: String(body.city || ""),
        area: String(body.area || ""),
        note: String(body.note || ""),
        quantity: String(quantity),
        giftWrap: String(body.giftWrap || false),
        deliveryZone: String(body.deliveryZone || ""),
        deviceFingerprint,
        shippingPartner,
        utm: JSON.stringify(body.utm || {}),
        selectedOptions: JSON.stringify(body.selectedOptions || {}),
        cart: JSON.stringify(items),
        discount: String(discount || 0),
        giftWrapFee: String(giftWrapFee || 0),
        shippingFee: String(shippingFee || 0)
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
