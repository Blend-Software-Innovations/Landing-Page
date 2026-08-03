import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { getAuditLog } from "../../../lib/audit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-audit:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!hasPermission(role, "audit:read")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    if (!requireDb(res)) return;
    const limit = Number(req.query.limit || 20);
    const log = await getAuditLog(Number.isFinite(limit) ? Math.min(limit, 100) : 20);
    return res.status(200).json({ entries: log });
  }

  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
}

