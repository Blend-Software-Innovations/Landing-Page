import type { NextApiRequest, NextApiResponse } from "next";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { recordEvent } from "../../lib/analytics";
import { recordAbandoned, markRecovered } from "../../lib/abandoned";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`analytics:${ip}`, publicRateLimitPerMin, 60_000)) {
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

  if (body.name === "begin_checkout") {
    const payload = body.payload || {};
    await recordAbandoned({
      name: String((payload as any).name || ""),
      email: String((payload as any).email || ""),
      phone: String((payload as any).phone || ""),
      total: Number((payload as any).value || 0),
      items: (payload as any).items || null,
      utm: (payload as any).utm || null
    });
  }
  if (body.name === "purchase") {
    const payload = body.payload || {};
    await markRecovered({
      email: String((payload as any).email || ""),
      phone: String((payload as any).phone || "")
    });
  }

  return res.status(200).json({ status: "ok" });
}
