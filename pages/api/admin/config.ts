import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, saveConfig } from "../../../lib/siteConfig.server";
import { hasPermission, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = await resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-config:${ip}`, adminRateLimitPerMin, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!hasPermission(role, "config:read")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!requireDb(res)) return;

  if (req.method === "GET") {
    const config = await getConfig();
    return res.status(200).json(config);
  }

  if (req.method === "POST") {
    if (!hasPermission(role, "config:write")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!requireCsrf(req, res)) return;
    const body = req.body as any;
    const autosave = String(req.query.autosave || "") === "1";
    await saveConfig(body, { role, ip, note: autosave ? "autosave" : "manual-save" });
    return res.status(200).json({ status: "ok" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}

