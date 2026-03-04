import type { NextApiRequest } from "next";
import { jwtVerify } from "jose";
import { env } from "./env";
import { findUserById } from "./auth";

export type AdminRole = "owner" | "admin" | "staff" | "none";

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.AUTH_JWT_SECRET);

function parseCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const part = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  if (!part) return null;
  return decodeURIComponent(part.split("=")[1] || "");
}

export async function resolveRole(req: NextApiRequest): Promise<AdminRole> {
  const token = parseCookie(req, "access_token");
  if (!token) return "none";
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    const role = (payload.role as AdminRole) || "none";
    return role;
  } catch {
    return "none";
  }
}

export async function resolveActor(req: NextApiRequest) {
  const token = parseCookie(req, "access_token");
  if (!token) return { actor: "unknown", role: "none" as AdminRole };
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    const role = (payload.role as AdminRole) || "none";
    const sub = payload.sub as string | undefined;
    const user = sub ? findUserById(sub) : null;
    return { actor: user?.email || sub || "unknown", role };
  } catch {
    return { actor: "unknown", role: "none" as AdminRole };
  }
}

export function canRead(role: AdminRole) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canWrite(role: AdminRole) {
  return role === "owner" || role === "admin";
}
