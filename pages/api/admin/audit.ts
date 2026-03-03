import type { NextApiRequest, NextApiResponse } from "next";
import { canRead, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { getAuditLog } from "../../../lib/audit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-audit:${ip}`, 30, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!canRead(role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const limit = Number(req.query.limit || 20);
    const log = await getAuditLog(Number.isFinite(limit) ? Math.min(limit, 100) : 20);
    return res.status(200).json({ entries: log });
  }

  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
}
