import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { createResetToken } from "../../../lib/auth";
import { logger } from "../../../lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (await isRateLimited(`auth-reset:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Missing email" });

  // Per-email throttle (stricter than per-IP) blunts reset-flood and account enumeration
  // from a single IP rotating through many email addresses.
  const emailKey = email.trim().toLowerCase();
  if (await isRateLimited(`auth-reset:email:${emailKey}`, 3, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  const token = await createResetToken(email);
  if (!token) return res.status(200).json({ status: "ok" });

  // SECURITY: the reset token must never be returned over an unauthenticated HTTP response in
  // production — that is account takeover for anyone who knows an email. It must also never be
  // written to logs, where it would be readable by anyone with log access. In production only the
  // fact that a reset was requested is logged; the token is returned in the response body solely
  // in development. Wire up real email delivery to make production resets usable.
  if (process.env.NODE_ENV === "production") {
    logger.warn({ event: "password_reset_requested", email: emailKey }, "Password reset requested — wire up email delivery");
    return res.status(200).json({ status: "ok" });
  }

  return res.status(200).json({ status: "ok", token });
}
