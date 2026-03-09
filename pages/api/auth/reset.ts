import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { resetPassword } from "../../../lib/auth";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`auth-reset:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) return res.status(400).json({ error: "Missing reset data" });

  const ok = await resetPassword(token, newPassword);
  if (!ok) return res.status(400).json({ error: "Invalid or expired token" });
  return res.status(200).json({ status: "ok" });
}
