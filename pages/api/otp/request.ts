import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { isRateLimited } from "../../../lib/rateLimit";
import { publicRateLimitPerMin, otpLength, otpTtlMin, otpResendCooldownSec } from "../../../lib/env";
import { requestOtp, setOtpCooldown } from "../../../lib/otp";
import twilio from "twilio";
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
  if (isRateLimited(`otp-request:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const { phone } = req.body as { phone?: string };
  const normalized = normalizePhone(String(phone || ""));
  if (!isValidBdPhone(normalized)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  const config = await getConfig();
  const cooldownSec = config.otpSettings?.cooldownSec ?? otpResendCooldownSec;
  const { otpId, code, blockedUntil } = requestOtp(normalized, otpTtlMin, otpLength) as {
    otpId: string;
    code: string;
    blockedUntil?: string;
  };
  if (!otpId) {
    return res.status(429).json({ error: "OTP already sent. Please wait.", blockedUntil });
  }
  setOtpCooldown(normalized, cooldownSec);

  const twilioSid = process.env.TWILIO_SID || "";
  const twilioAuth = process.env.TWILIO_AUTH || "";
  const twilioPhone = process.env.TWILIO_PHONE || "";
  const client = twilioSid && twilioAuth ? twilio(twilioSid, twilioAuth) : null;

  if (client && twilioPhone) {
    try {
      await client.messages.create({
        to: normalized,
        from: twilioPhone,
        body: `Your OTP code is ${code}. It expires in ${otpTtlMin} minutes.`
      });
    } catch (error) {
      console.error("OTP SMS failed", error);
    }
  }

  return res.status(200).json({
    status: "ok",
    otpId,
    ...(process.env.NODE_ENV !== "production" ? { code } : {})
  });
}
