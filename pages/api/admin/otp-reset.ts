import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { clearOtpCooldown, clearOtpLock } from "../../../lib/otp";
import { requireCsrf } from "../../../lib/csrf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "analytics:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
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
