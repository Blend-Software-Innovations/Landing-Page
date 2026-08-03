import type { NextApiRequest, NextApiResponse } from "next";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { adminRateLimitPerMin } from "../../../lib/env";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { requireDb } from "../../../lib/db";
import { getPool } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  if (!hasPermission(role, "analytics:read")) return res.status(401).json({ error: "Unauthorized" });
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-utm:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests" });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireDb(res)) return;

  const pool = getPool();
  if (!pool) return res.status(200).json({ rows: [] });

  const result = await pool.query(
    `select coalesce("utmSource",'') as source,
            coalesce("utmCampaign",'') as campaign,
            count(*)::int as orders,
            sum(case when "paymentStatus" = 'PAID' then "total" else 0 end)::int as revenue
     from "Order"
     group by "utmSource","utmCampaign"
     order by revenue desc nulls last, orders desc`
  );
  return res.status(200).json({ rows: result.rows || [] });
}
