import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { isRateLimited } from "../../../lib/rateLimit";
import { publicRateLimitPerMin, otpSessionTtlMin, otpLockoutMaxAttempts, otpLockoutMin } from "../../../lib/env";
import { validateOtpToken, verifyOtp } from "../../../lib/otp";
import { getConfig } from "../../../lib/siteConfig.server";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("8801")) return `+${digits}`;
  if (digits.startsWith("01")) return `+88${digits}`;
  if (digits.startsWith("880")) return `+${digits}`;
  return input;
}

function isValidBdPhone(phone: string) {
  return /^\+8801\d{9}$/.test(phone);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`otp-verify:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { phone, otpId, code } = req.body as { phone?: string; otpId?: string; code?: string };
  const normalized = normalizePhone(String(phone || ""));
  if (!isValidBdPhone(normalized)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  if (!otpId || !code) return res.status(400).json({ error: "Missing OTP data" });

  const config = await getConfig();
  const lockoutAttempts = config.otpSettings?.lockoutAttempts ?? otpLockoutMaxAttempts;
  const lockoutMin = config.otpSettings?.lockoutMin ?? otpLockoutMin;
  const token = await verifyOtp(
    String(otpId),
    normalized,
    String(code),
    otpSessionTtlMin,
    lockoutAttempts,
    lockoutMin
  );
  if (!token || !(await validateOtpToken(token, normalized))) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  return res.status(200).json({ status: "ok", otpToken: token });
}
