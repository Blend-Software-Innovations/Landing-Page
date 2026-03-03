import type { NextApiRequest, NextApiResponse } from "next";
import { canRead, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { getAuditEntry } from "../../../lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-audit-entry:${ip}`, 30, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!canRead(role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = String(req.query.id || "");
  if (!id) {
    return res.status(400).json({ error: "Missing audit id." });
  }

  const entry = await getAuditEntry(id);
  if (!entry) {
    return res.status(404).json({ error: "Audit entry not found." });
  }

  return res.status(200).json(entry);
}
