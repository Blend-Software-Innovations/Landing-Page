import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import twilio from "twilio";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { applyCors } from "../../lib/cors";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" }) : null;

const twilioSid = process.env.TWILIO_SID || "";
const twilioAuth = process.env.TWILIO_AUTH || "";
const twilioPhone = process.env.TWILIO_PHONE || "";
const twilioClient = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`sms:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (!twilioClient || !twilioPhone) {
    return res.status(500).json({ error: "Twilio is not configured" });
  }

  const body = req.body as { phone?: string; message?: string; sessionId?: string };
  let phone = body.phone || "";
  let message = body.message || "Your order has been confirmed. Thank you.";

  if (body.sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(body.sessionId);
      const meta = session.metadata || {};
      phone = meta.phone || phone;
      if (meta.name) {
        message = `Hi ${meta.name}, your payment is confirmed. We will process your order soon.`;
      }
    } catch (error) {
      console.error("Failed to fetch Stripe session", error);
    }
  }

  if (!phone) {
    return res.status(400).json({ error: "Missing phone number" });
  }

  try {
    const result = await twilioClient.messages.create({
      to: phone,
      from: twilioPhone,
      body: message
    });
    return res.status(200).json({ status: "sent", sid: result.sid });
  } catch (error) {
    console.error("Twilio send error", error);
    return res.status(500).json({ error: "Failed to send SMS" });
  }
}
