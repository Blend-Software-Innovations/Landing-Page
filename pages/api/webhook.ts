import { logger } from "../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import twilio from "twilio";
import { commitInventory, resolveInventoryVariantId } from "../../lib/inventory";
import { createOrder } from "../../lib/orders";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { requireDb } from "../../lib/db";
import { detectFraud } from "../../lib/fraud";

export const config = { api: { bodyParser: false } };

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-01-28.clover" }) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const twilioSid = process.env.TWILIO_SID || "";
const twilioAuth = process.env.TWILIO_AUTH || "";
const twilioPhone = process.env.TWILIO_PHONE || "";
const twilioClient = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;


async function readBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`webhook:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (!stripe || !webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook not configured" });
  }
  if (!requireDb(res)) return;

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).json({ error: "Missing signature" });
  }

  const raw = await readBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (error) {
    logger.error({ err: error }, "Webhook signature verification failed");
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};
    const stripeTransactionId = session.payment_intent ? String(session.payment_intent) : "";

    // Idempotency guard: Stripe can retry webhooks — skip if already processed
    if (stripeTransactionId) {
      const { getPrisma } = await import("../../lib/prisma");
      const prisma = getPrisma() as any;
      const existing = await prisma.order.findFirst({ where: { transactionId: stripeTransactionId } });
      if (existing) {
        return res.status(200).json({ received: true });
      }
    }

    const reservationIds = meta.reservationIds ? meta.reservationIds.split(",").filter(Boolean) : [];
    for (const id of reservationIds) {
      await commitInventory(id);
    }
    const fraud = await detectFraud({
      phone: meta.phone || "",
      deviceFingerprint: meta.deviceFingerprint || "",
      transactionId: stripeTransactionId
    });
    let cartItems: Array<any> = [];
    if (meta.cart) {
      try {
        cartItems = JSON.parse(meta.cart) as Array<any>;
      } catch {
        cartItems = [];
      }
    }
    const itemsPayload = cartItems.length
      ? await Promise.all(
          cartItems.map(async (item) => ({
            productId: String(item.productId || ""),
            variantId: (await resolveInventoryVariantId(String(item.variantId || ""))) || "",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 1)
          }))
        )
      : [
          {
            productId: meta.productId || "",
            variantId: (await resolveInventoryVariantId(String(meta.variantId || ""))) || "",
            quantity: Number(meta.quantity || 1),
            unitPrice: Number(meta.unitPrice || 0),
            lineTotal: Number(meta.unitPrice || 0) * Number(meta.quantity || 1)
          }
        ];
    await createOrder({
      customerName: meta.name || "Guest",
      phone: meta.phone || "",
      address: meta.address || "",
      city: meta.city || "",
      area: meta.area || "",
      total: Number(session.amount_total || 0) / 100 || 0,
      paymentMethod: "STRIPE",
      paymentStatus: "PAID",
      transactionId: stripeTransactionId || undefined,
      shippingPartner: meta.shippingPartner || undefined,
      deviceFingerprint: meta.deviceFingerprint || undefined,
      fraudFlags: fraud.flags,
      fraudScore: fraud.score,
      utm: meta.utm ? JSON.parse(meta.utm) : undefined,
      productId: meta.productId || "",
      variantId: meta.variantId || "",
      quantity: Number(meta.quantity || 1),
      unitPrice: Number(meta.unitPrice || 0),
      reservationIds,
      items: itemsPayload,
      status: "CONFIRMED"
    });
    if (twilioClient && twilioPhone && meta.phone) {
      try {
        await twilioClient.messages.create({
          to: meta.phone,
          from: twilioPhone,
          body: meta.name
            ? `Hi ${meta.name}, your payment is confirmed. We will process your order soon.`
            : "Payment confirmed. We will process your order soon."
        });
      } catch (error) {
        logger.error({ err: error }, "Twilio webhook send failed");
      }
    }
  }

  return res.status(200).json({ received: true });
}
