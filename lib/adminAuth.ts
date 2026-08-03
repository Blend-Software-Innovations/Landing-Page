import type { NextApiRequest } from "next";
import { jwtVerify } from "jose";
import { env } from "./env";
import { findUserById } from "./auth";

export type AdminRole = "owner" | "admin" | "staff" | "none";
export type AdminPermission =
  | "config:read"
  | "config:write"
  | "media:read"
  | "media:write"
  | "orders:read"
  | "orders:write"
  | "orders:pack"
  | "inventory:read"
  | "inventory:write"
  | "analytics:read"
  | "audit:read"
  | "users:read"
  | "users:write";

const rolePermissions: Record<Exclude<AdminRole, "none">, AdminPermission[]> = {
  owner: [
    "config:read",
    "config:write",
    "media:read",
    "media:write",
    "orders:read",
    "orders:write",
    "orders:pack",
    "inventory:read",
    "inventory:write",
    "analytics:read",
    "audit:read",
    "users:read",
    "users:write"
  ],
  admin: [
    "config:read",
    "config:write",
    "media:read",
    "media:write",
    "orders:read",
    "orders:write",
    "orders:pack",
    "inventory:read",
    "inventory:write",
    "analytics:read",
    "audit:read",
    "users:read",
    "users:write"
  ],
  staff: ["config:read", "media:read", "orders:read", "orders:pack", "inventory:read", "analytics:read", "audit:read"]
};

const encoder = new TextEncoder();

function requireAccessSecret() {
  if (!env.AUTH_JWT_SECRET) {
    throw new Error("Missing AUTH_JWT_SECRET");
  }
  return encoder.encode(env.AUTH_JWT_SECRET);
}

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
    const { payload } = await jwtVerify(token, requireAccessSecret());
    const role = (payload.role as AdminRole) || "none";
    return role;
  } catch {
    return "none";
  }
}

export async function resolveActor(
  req: NextApiRequest
): Promise<{ actor: string; role: AdminRole; sub?: string }> {
  const token = parseCookie(req, "access_token");
  if (!token) return { actor: "unknown", role: "none" as AdminRole };
  try {
    const { payload } = await jwtVerify(token, requireAccessSecret());
    const role = (payload.role as AdminRole) || "none";
    const sub = payload.sub as string | undefined;
    const user = sub ? await findUserById(sub) : null;
    return { actor: user?.email || sub || "unknown", role, sub };
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

export function hasPermission(role: AdminRole, permission: AdminPermission) {
  if (role === "none") return false;
  return rolePermissions[role]?.includes(permission);
}
