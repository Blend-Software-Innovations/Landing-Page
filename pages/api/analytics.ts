import type { NextApiRequest, NextApiResponse } from "next";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { recordEvent } from "../../lib/analytics";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`analytics:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { name?: string; payload?: Record<string, unknown> };
  if (!body?.name) {
    return res.status(400).json({ error: "Missing event name." });
  }

  await recordEvent({
    name: body.name,
    payload: body.payload || {},
    createdAt: new Date().toISOString(),
    ip,
    userAgent: req.headers["user-agent"],
    referrer: req.headers.referer
  });

  return res.status(200).json({ status: "ok" });
}
