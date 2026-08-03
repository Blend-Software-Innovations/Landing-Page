import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { rotateRefreshToken } from "../../../lib/auth";
import { accessCookie, refreshCookie, clearAccessCookie, clearRefreshCookie } from "../../../lib/authCookies";
import { csrfCookie, issueCsrfToken } from "../../../lib/csrf";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = getClientIp(req);
  if (await isRateLimited(`auth-refresh:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    res.setHeader("Set-Cookie", [clearAccessCookie(), clearRefreshCookie()]);
    return res.status(401).json({ error: "Missing refresh token" });
  }

  const tokens = await rotateRefreshToken(refreshToken);
  if (!tokens) {
    res.setHeader("Set-Cookie", [clearAccessCookie(), clearRefreshCookie()]);
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const csrf = issueCsrfToken();
  res.setHeader("Set-Cookie", [accessCookie(tokens.accessToken), refreshCookie(tokens.refreshToken), csrfCookie(csrf)]);
  return res.status(200).json({ status: "ok" });
}
