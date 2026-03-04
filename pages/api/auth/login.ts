import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { authRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { ensureAdminSeed, issueTokens, verifyCredentials } from "../../../lib/auth";
import { accessCookie, refreshCookie } from "../../../lib/authCookies";
import { csrfCookie, issueCsrfToken } from "../../../lib/csrf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`auth-login:${ip}`, authRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many attempts" });
  }

  await ensureAdminSeed();
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = await verifyCredentials(email, password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const tokens = await issueTokens(user);
  const csrf = issueCsrfToken();
  res.setHeader("Set-Cookie", [accessCookie(tokens.accessToken), refreshCookie(tokens.refreshToken), csrfCookie(csrf)]);
  return res.status(200).json({ status: "ok", role: user.role });
}
