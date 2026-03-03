import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import twilio from "twilio";

export const config = { api: { bodyParser: false } };

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-01-28.clover" }) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const twilioSid = process.env.TWILIO_SID || "";
const twilioAuth = process.env.TWILIO_AUTH || "";
const twilioPhone = process.env.TWILIO_PHONE || "";
const twilioClient = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;

const dataPath = path.join(process.cwd(), "data", "stripe-webhook.jsonl");

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

  if (!stripe || !webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook not configured" });
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).json({ error: "Missing signature" });
  }

  const raw = await readBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return res.status(400).json({ error: "Invalid signature" });
  }

  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.appendFileSync(dataPath, `${JSON.stringify({ type: event.type, createdAt: new Date().toISOString() })}\n`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};
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
        console.error("Twilio webhook send failed", error);
      }
    }
  }

  return res.status(200).json({ received: true });
}
