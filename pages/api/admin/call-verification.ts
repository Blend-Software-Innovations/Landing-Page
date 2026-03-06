import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited } from "../../../lib/rateLimit";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";
import { getPrisma } from "../../../lib/prisma";
import { writeOrderAudit } from "../../../lib/notifications";

const allowed = new Set(["VERIFIED", "UNVERIFIED", "PENDING"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "orders:write")) return res.status(401).json({ error: "Unauthorized" });
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-call-verify:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;
  if (!requireCsrf(req, res)) return;

  const body = req.body as { orderId?: string; status?: string; notes?: string };
  const orderId = String(body.orderId || "");
  const status = String(body.status || "PENDING");
  if (!orderId || !allowed.has(status)) return res.status(400).json({ error: "Invalid request" });

  const prisma = getPrisma() as any;
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      callStatus: status,
      callNotes: body.notes ? String(body.notes).slice(0, 400) : null,
      callVerifiedAt: status === "VERIFIED" ? new Date() : null
    }
  });

  await writeOrderAudit({
    orderId,
    role,
    action: "order.call_verification",
    data: { status, notes: body.notes || "" }
  });

  return res.status(200).json({ order });
}
