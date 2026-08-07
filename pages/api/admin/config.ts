import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig, saveConfig, deepMerge } from "../../../lib/siteConfig.server";
import { defaultConfig, type SiteConfig } from "../../../lib/siteConfig";
import { hasPermission, resolveActor } from "../../../lib/adminAuth";
import { isRateLimited, getClientIp } from "../../../lib/rateLimit";
import { adminRateLimitPerMin } from "../../../lib/env";
import { requireCsrf } from "../../../lib/csrf";
import { requireDb } from "../../../lib/db";

const MAX_CONFIG_BYTES = 300_000;
const OBJECT_FIELDS = ["heroTitle", "heroBody", "productCardTitle"] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await resolveActor(req);
  const role = session.role;
  const ip = getClientIp(req);
  if (await isRateLimited(`admin-config:${ip}`, adminRateLimitPerMin, 60_000)) {
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
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Config must be a JSON object." });
    }
    if (JSON.stringify(body).length > MAX_CONFIG_BYTES) {
      return res.status(400).json({ error: "Config payload too large." });
    }
    const allowedKeys = new Set(Object.keys(defaultConfig));
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) delete body[key];
    }
    for (const field of OBJECT_FIELDS) {
      const value = body[field];
      if (value !== undefined && (typeof value !== "object" || value === null || Array.isArray(value))) {
        return res.status(400).json({ error: `Invalid ${field}: expected an object.` });
      }
    }
    // Merge onto the CURRENT config rather than replacing it.
    //
    // saveConfig writes the whole blob, and the check above only strips unknown
    // keys — it never required known ones to be present. So a partial body
    // ({"priceBdt":1}) replaced the entire row, and getConfig then merged that
    // over defaultConfig: brand name, products, delivery areas, variants and
    // bundles all silently reverted to defaults, with a 200 OK. The panel
    // autosaves on a timer, so one truncated request on a flaky connection was
    // enough to reset the store.
    //
    // Merging makes a partial write only able to change what it names. Arrays
    // are still replaced wholesale by deepMerge, so removing a gallery image or
    // a bundle tier keeps working — the panel always sends the full array.
    const current = await getConfig();
    const merged = deepMerge(current, body as Partial<SiteConfig>);

    const autosave = String(req.query.autosave || "") === "1";
    await saveConfig(merged, {
      actor: session.actor,
      role,
      ip,
      note: autosave ? "autosave" : "manual-save"
    });
    return res.status(200).json({ status: "ok" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
