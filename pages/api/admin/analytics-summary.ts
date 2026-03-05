import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { getAnalyticsSummary } from "../../../lib/analytics";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-analytics:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!hasPermission(role, "analytics:read")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const summary = await getAnalyticsSummary();
  return res.status(200).json(summary);
}

