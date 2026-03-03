import type { NextApiRequest, NextApiResponse } from "next";
import { canRead, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { getAnalyticsSummary } from "../../../lib/analytics";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-analytics:${ip}`, 30, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!canRead(role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const summary = await getAnalyticsSummary();
  return res.status(200).json(summary);
}
