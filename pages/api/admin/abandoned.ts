import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { listAbandoned } from "../../../lib/abandoned";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "analytics:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-abandoned:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const rows = await listAbandoned(50);
  return res.status(200).json({ rows });
}
