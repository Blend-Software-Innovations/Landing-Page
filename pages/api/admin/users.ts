import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { listUsers, updateUserRole } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "users:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`admin-users:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (req.method === "GET") {
    const users = await listUsers();
    return res.status(200).json({ users });
  }

  if (req.method === "POST") {
    if (!hasPermission(role, "users:write")) return res.status(403).json({ error: "Forbidden" });
    if (!requireCsrf(req, res)) return;
    const body = req.body as { id?: string; role?: "owner" | "admin" | "staff" };
    if (!body.id || !body.role) return res.status(400).json({ error: "Missing data" });
    const user = await updateUserRole(body.id, body.role);
    return res.status(200).json({ user });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
