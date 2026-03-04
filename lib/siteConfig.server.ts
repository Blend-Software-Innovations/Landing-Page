import type { SiteConfig, Review, OptionGroup, GalleryItem, Experiment, ExperimentVariant } from "./siteConfig";
import { defaultConfig } from "./siteConfig";
import fs from "fs";
import path from "path";
import { getPool } from "./db";
import { appendAudit } from "./audit";

const dataPath = path.join(process.cwd(), "data", "site.json");
const configId = process.env.CONFIG_ID || "default";

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (typeof base !== "object" || base === null) return base;
  const result: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      result[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = deepMerge((result as any)[key], value as any);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export async function getConfig(): Promise<SiteConfig> {
  try {
    const pool = getPool();
    if (pool) {
      try {
        const result = await pool.query("select data from site_config where id = $1", [configId]);
        if (result.rows[0]?.data) {
          return deepMerge(defaultConfig, result.rows[0].data as Partial<SiteConfig>);
        }
      } catch (error) {
        console.error("Failed to load config from database", error);
      }
    }

    if (!fs.existsSync(dataPath)) return defaultConfig;
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    return deepMerge(defaultConfig, parsed);
  } catch {
    return defaultConfig;
  }
}

export async function saveConfig(
  config: SiteConfig,
  meta?: { actor?: string; role?: string; ip?: string; note?: string; skipAudit?: boolean }
) {
  const current = await getConfig();
  const changed = JSON.stringify(current) !== JSON.stringify(config);
  if (changed && !meta?.skipAudit) {
    await appendAudit({
      actor: meta?.actor,
      role: meta?.role,
      ip: meta?.ip,
      note: meta?.note,
      data: current
    });
  }
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        "insert into site_config (id, data, updated_at) values ($1, $2, now()) on conflict (id) do update set data = excluded.data, updated_at = now()",
        [configId, config]
      );
      return;
    } catch (error) {
      console.error("Failed to save config to database", error);
    }
  }

  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(dataPath, json, "utf8");
}
