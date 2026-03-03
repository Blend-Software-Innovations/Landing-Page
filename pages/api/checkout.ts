import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2026-01-28.clover" }) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured." });
  }

  const body = req.body as Record<string, unknown>;
  const total = Number(body.total || 0);
  const quantity = Number(body.quantity || 1);
  const name = String(body.name || "");
  const email = String(body.email || "");
  const phone = String(body.phone || "");

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (req.headers.origin ? String(req.headers.origin) : "http://localhost:3000");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: "Custom Order",
              description: "Handmade product purchase"
            },
            unit_amount: Math.max(1, Math.round(total * 100))
          },
          quantity: 1
        }
      ],
      customer_email: email || undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        name,
        email,
        phone,
        address: String(body.address || ""),
        city: String(body.city || ""),
        area: String(body.area || ""),
        note: String(body.note || ""),
        quantity: String(quantity),
        giftWrap: String(body.giftWrap || false),
        deliveryZone: String(body.deliveryZone || ""),
        productId: String(body.productId || ""),
        selectedOptions: JSON.stringify(body.selectedOptions || {})
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
