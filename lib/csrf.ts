import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { env } from "./env";

const isProd = env.NODE_ENV === "production";

function parseCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const part = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  if (!part) return null;
  return decodeURIComponent(part.split("=")[1] || "");
}

export function csrfCookie(value: string) {
  return serialize("csrf_token", value, {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    domain: env.AUTH_COOKIE_DOMAIN || undefined
  });
}

export function clearCsrfCookie() {
  return serialize("csrf_token", "", { httpOnly: false, secure: isProd, sameSite: "lax", path: "/", maxAge: 0 });
}

export function issueCsrfToken() {
  return crypto.randomBytes(16).toString("hex");
}

export function requireCsrf(req: NextApiRequest, res: NextApiResponse) {
  const cookieToken = parseCookie(req, "csrf_token");
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return false;
  }
  return true;
}
