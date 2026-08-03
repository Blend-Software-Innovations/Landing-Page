import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { revokeRefreshToken } from "../../../lib/auth";
import { clearAccessCookie, clearRefreshCookie } from "../../../lib/authCookies";
import { clearCsrfCookie } from "../../../lib/csrf";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = getClientIp(req);
  if (await isRateLimited(`auth-logout:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) await revokeRefreshToken(refreshToken);
  res.setHeader("Set-Cookie", [clearAccessCookie(), clearRefreshCookie(), clearCsrfCookie()]);
  return res.status(200).json({ status: "ok" });
}
