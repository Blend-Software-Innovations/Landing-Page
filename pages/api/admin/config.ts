import type { NextApiRequest, NextApiResponse } from "next";
import type { SiteConfig } from "../../../lib/siteConfig";
import { getConfig, saveConfig } from "../../../lib/siteConfig.server";
import { canRead, canWrite, resolveRole } from "../../../lib/adminAuth";
import { isRateLimited } from "../../../lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = resolveRole(req);
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(`admin-config:${ip}`, 60, 60_000)) {
    return res.status(429).json({ error: "Too many requests." });
  }

  if (!canRead(role)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const config = await getConfig();
    return res.status(200).json(config);
  }

  if (req.method === "POST") {
    if (!canWrite(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const body = req.body as SiteConfig;
    const autosave = String(req.query.autosave || "") === "1";
    await saveConfig(body, { role, ip, note: autosave ? "autosave" : "manual-save" });
    return res.status(200).json({ status: "ok" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
