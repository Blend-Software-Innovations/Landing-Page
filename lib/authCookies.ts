import { serialize } from "cookie";
import { env } from "./env";

const isProd = env.NODE_ENV === "production";

export function accessCookie(value: string) {
  return serialize("access_token", value, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
    domain: env.AUTH_COOKIE_DOMAIN || undefined
  });
}

export function refreshCookie(value: string) {
  return serialize("refresh_token", value, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: 60 * 60 * 24 * 7,
    domain: env.AUTH_COOKIE_DOMAIN || undefined
  });
}

export function clearAccessCookie() {
  return serialize("access_token", "", { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 0 });
}

export function clearRefreshCookie() {
  return serialize("refresh_token", "", { httpOnly: true, secure: isProd, sameSite: "lax", path: "/api/auth/refresh", maxAge: 0 });
}
