import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { isRateLimited } from "../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../lib/env";
import { applyCors } from "../../lib/cors";

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`capi:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const pixelId = process.env.META_PIXEL_ID || "";
  const accessToken = process.env.META_CAPI_TOKEN || "";
  const testCode = process.env.META_TEST_EVENT_CODE || "";
  if (!pixelId || !accessToken) {
    return res.status(200).json({ status: "skipped" });
  }

  const { event, payload, eventId } = req.body as { event?: string; payload?: Record<string, any>; eventId?: string };
  if (!event) return res.status(400).json({ error: "Missing event" });

  const eventTime = Math.floor(Date.now() / 1000);
  const resolvedEventId = eventId || crypto.randomUUID();

  const userData: Record<string, string> = {};
  if (payload?.email) userData.em = hashValue(payload.email);
  if (payload?.phone) userData.ph = hashValue(payload.phone);
  const cookies = req.headers.cookie || "";
  const fbp = cookies.split(";").map((c) => c.trim()).find((c) => c.startsWith("_fbp="))?.split("=")[1];
  const fbc = cookies.split(";").map((c) => c.trim()).find((c) => c.startsWith("_fbc="))?.split("=")[1];

  const capiPayload = {
    data: [
      {
        event_name: event,
        event_time: eventTime,
        event_id: resolvedEventId,
        action_source: "website",
        event_source_url: payload?.sourceUrl || req.headers.referer || "",
        user_data: {
          ...userData,
          fbp: fbp || undefined,
          fbc: fbc || undefined,
          client_ip_address: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
          client_user_agent: req.headers["user-agent"]
        },
        custom_data: payload || {}
      }
    ]
  };
  if (testCode) {
    (capiPayload as any).test_event_code = testCode;
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(capiPayload)
  });

  const body = await response.text();
  return res.status(200).json({ status: "ok", response: body });
}
