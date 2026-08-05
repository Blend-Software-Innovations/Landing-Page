import { logger } from "../../lib/logger";
﻿import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { applyCors } from "../../lib/cors";
import { sendSms, twilioConfigured } from "../../lib/twilio";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-04-22.dahlia" }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (await isRateLimited(`sms:${ip}`, 10, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (!twilioConfigured()) {
    return res.status(500).json({ error: "Twilio is not configured" });
  }

  // This endpoint must never act as an open SMS relay: the recipient and the
  // message are derived exclusively from a verified Stripe checkout session —
  // client-supplied phone/message values are not accepted.
  const body = req.body as { sessionId?: string };
  const sessionId = String(body.sessionId || "");
  if (!sessionId || !stripe) {
    return res.status(400).json({ error: "Missing sessionId" });
  }

  let phone = "";
  let message = "Payment confirmed. We will process your order soon.";
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Session is not paid" });
    }
    const meta = session.metadata || {};
    phone = meta.phone || "";
    if (meta.name) {
      message = `Hi ${meta.name}, your payment is confirmed. We will process your order soon.`;
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch Stripe session");
    return res.status(400).json({ error: "Invalid sessionId" });
  }

  if (!phone) {
    return res.status(400).json({ error: "No phone on session" });
  }
  if (await isRateLimited(`sms:session:${sessionId}`, 1, 24 * 60 * 60_000)) {
    return res.status(429).json({ error: "SMS already sent for this session" });
  }

  const sent = await sendSms(phone, message);
  if (!sent) {
    return res.status(500).json({ error: "Failed to send SMS" });
  }
  return res.status(200).json({ status: "sent" });
}
