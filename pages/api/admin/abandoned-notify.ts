import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";
import { updateAbandoned } from "../../../lib/abandoned";
import { getConfig } from "../../../lib/siteConfig.server";
import twilio from "twilio";

const twilioSid = process.env.TWILIO_SID || "";
const twilioAuth = process.env.TWILIO_AUTH || "";
const twilioPhone = process.env.TWILIO_PHONE || "";
const twilioClient = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:write")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-abandoned-notify:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const body = req.body as { id?: string; channel?: "sms" | "whatsapp" };
  const id = String(body.id || "");
  const channel = body.channel || "sms";
  if (!id) return res.status(400).json({ error: "Missing id" });

  const prisma = getPrisma() as any;
  const record = await prisma.abandonedCheckout.findUnique({ where: { id } });
  if (!record) return res.status(404).json({ error: "Not found" });

  const message = `Hi ${record.name || "there"}, you left items in your cart. Complete your order here: ${
    process.env.NEXT_PUBLIC_SITE_URL || ""
  }`;

  if (channel === "sms") {
    if (!twilioClient || !twilioPhone || !record.phone) {
      return res.status(400).json({ error: "SMS not configured" });
    }
    await twilioClient.messages.create({
      to: record.phone,
      from: twilioPhone,
      body: message
    });
  } else {
    const config = await getConfig();
    if (!record.phone) {
      return res.status(400).json({ error: "WhatsApp phone missing" });
    }
    const digits = String(record.phone).replace(/\D/g, "");
    const wa = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    await updateAbandoned(id, {
      lastNotifiedAt: new Date(),
      notifyCount: (record.notifyCount || 0) + 1
    });
    return res.status(200).json({ status: "ok", waUrl: wa, supportNumber: config.social?.whatsapp || "" });
  }

  await updateAbandoned(id, {
    lastNotifiedAt: new Date(),
    notifyCount: (record.notifyCount || 0) + 1
  });

  return res.status(200).json({ status: "ok" });
}
