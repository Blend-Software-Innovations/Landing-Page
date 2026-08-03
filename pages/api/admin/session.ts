import type { NextApiRequest, NextApiResponse } from "next";
import { resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-session:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }
  if (!requireDb(res)) return;
  const role = await resolveRole(req);
  return res.status(200).json({ role });
}
