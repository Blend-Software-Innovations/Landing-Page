import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { createResetToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`auth-reset:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "Missing email" });

  const token = await createResetToken(email);
  if (!token) return res.status(200).json({ status: "ok" });

  return res.status(200).json({ status: "ok", token });
}
