import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (await isRateLimited(`admin-manual-summary:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const prisma = getPrisma() as any;
  const [pending, verified, rejected] = await Promise.all([
    prisma.order.count({ where: { paymentMethod: "MANUAL", manualStatus: "PENDING" } }),
    prisma.order.count({ where: { paymentMethod: "MANUAL", manualStatus: "VERIFIED" } }),
    prisma.order.count({ where: { paymentMethod: "MANUAL", manualStatus: "REJECTED" } })
  ]);

  return res.status(200).json({ pending, verified, rejected });
}
