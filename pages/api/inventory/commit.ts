import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { commitInventory } from "../../../lib/inventory";
import { isRateLimited } from "../../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../../lib/env";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`inventory-commit:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!requireDb(res)) return;
  const { reservationId, reservationIds } = req.body as { reservationId?: string; reservationIds?: string[] };
  const ids = reservationIds?.length ? reservationIds : reservationId ? [reservationId] : [];
  if (!ids.length) return res.status(400).json({ error: "Missing reservationId" });
  let committed = 0;
  for (const id of ids) {
    const ok = await commitInventory(id);
    if (ok) committed += 1;
  }
  return res.status(200).json({ status: "committed", committed });
}
