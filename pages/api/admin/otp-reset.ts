import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { clearOtpCooldown, clearOtpLock } from "../../../lib/otp";
import { requireCsrf } from "../../../lib/csrf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { role, actor } = await resolveActor(req);
  // Clearing an OTP lockout is a WRITE, and it disarms brute-force protection on
  // an arbitrary customer number. It was gated on analytics:read, which staff
  // hold — so any staff account could loop it to enable unlimited OTP guessing
  // and SMS pumping against any phone. orders:write excludes staff.
  if (!hasPermission(role, "orders:write")) return res.status(403).json({ error: "Forbidden" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-otp-reset:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const body = req.body as { phone?: string };
  const phone = String(body.phone || "");
  if (!phone) return res.status(400).json({ error: "Missing phone" });

  await clearOtpLock(phone);
  await clearOtpCooldown(phone);
  return res.status(200).json({ status: "ok" });
}
