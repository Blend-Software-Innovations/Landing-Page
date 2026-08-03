import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getAuditEntry } from "../../../lib/audit";
import { saveConfig } from "../../../lib/siteConfig.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-rollback:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!hasPermission(role, "config:write")) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const body = req.body as { id?: string };
  if (!body?.id) {
    return res.status(400).json({ error: "Missing audit id." });
  }

  const entry = await getAuditEntry(body.id);
  if (!entry) {
    return res.status(404).json({ error: "Audit entry not found." });
  }

  await saveConfig(entry.data, { role, ip, note: `rollback:${entry.id}` });
  return res.status(200).json({ status: "ok" });
}

