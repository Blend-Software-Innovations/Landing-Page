import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "../../../lib/cors";
import { releaseInventory } from "../../../lib/inventory";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { publicRateLimitPerMin } from "../../../lib/env";
import { requireDb } from "../../../lib/db";
import { verifyReservationIds } from "../../../lib/reservationSig";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const ip = getClientIp(req);
  if (await isRateLimited(`inventory-release:${ip}`, publicRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (!requireDb(res)) return;
  const { reservationId, reservationIds, rsig } = req.body as {
    reservationId?: string;
    reservationIds?: string[];
    rsig?: string;
  };
  const ids = reservationIds?.length ? reservationIds : reservationId ? [reservationId] : [];
  if (!ids.length) return res.status(400).json({ error: "Missing reservationId" });
  // Only callers holding the HMAC issued at checkout may act on these holds.
  if (!verifyReservationIds(ids, String(rsig || ""))) {
    return res.status(403).json({ error: "Invalid reservation signature" });
  }
  let released = 0;
  for (const id of ids) {
    const ok = await releaseInventory(id);
    if (ok) released += 1;
  }
  return res.status(200).json({ status: "released", released });
}
