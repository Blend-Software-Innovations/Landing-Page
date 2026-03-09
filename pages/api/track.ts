import type { NextApiRequest, NextApiResponse } from "next";
import { getPrisma } from "../../lib/prisma";
import { applyCors } from "../../lib/cors";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { requireDb } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`track:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!requireDb(res)) return;
  const { orderId, phone } = req.body as { orderId?: string; phone?: string };
  if (!orderId || !phone) return res.status(400).json({ error: "Missing data" });

  const prisma = getPrisma() as any;
  const order = await prisma.order.findFirst({
    where: { id: orderId, phone },
    include: { items: true }
  });
  if (!order) return res.status(404).json({ error: "Order not found" });

  return res.status(200).json({
    order: {
      id: order.id,
      status: order.status,
      trackingCode: order.trackingCode || "",
      shippingPartner: order.shippingPartner || "",
      createdAt: order.createdAt,
      items: order.items || []
    }
  });
}
