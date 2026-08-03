import type { NextApiRequest, NextApiResponse } from "next";
import { isRateLimited, getClientIp } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { recordEvent } from "../../lib/analytics";
import { recordAbandoned, markRecovered } from "../../lib/abandoned";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = getClientIp(req);
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
    // These fields are attacker-supplied and later flow into SMS sends — validate hard
    // and drop anything implausible rather than storing it.
    const rawName = String((payload as any).name || "");
    const rawEmail = String((payload as any).email || "").trim();
    const rawPhone = String((payload as any).phone || "").replace(/[\s-]/g, "");
    const phone = /^(?:\+880|0)1[3-9]\d{8}$/.test(rawPhone) ? rawPhone : "";
    const email = rawEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : "";
    // Cap AbandonedCheckout writes per IP; ordinary analytics events keep their existing limit.
    if (!(await isRateLimited(`abandoned:${ip}`, 5, 60 * 60_000))) {
      await recordAbandoned({
        name: rawName.slice(0, 120),
        email,
        phone,
        total: Number((payload as any).value || 0),
        items: (payload as any).items || null,
        utm: (payload as any).utm || null
      });
    }
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
