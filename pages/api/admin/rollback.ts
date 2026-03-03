import type { NextApiRequest, NextApiResponse } from "next";
import { canWrite, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { getAuditEntry } from "../../../lib/audit";
import { saveConfig } from "../../../lib/siteConfig.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-rollback:${ip}`, 10, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!canWrite(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

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
