import { logger } from "./logger";
﻿import type { SiteConfig, Review, OptionGroup, GalleryItem, Experiment, ExperimentVariant } from "./siteConfig";
import { defaultConfig } from "./siteConfig";
import fs from "fs";
import path from "path";
import { getPool } from "./db";
import { appendAudit } from "./audit";
import { getPrisma } from "./prisma";

const dataPath = path.join(process.cwd(), "data", "site.json");
const configId = process.env.CONFIG_ID || "default";

export function deepMerge<T>(base: T, override: Partial<T>): T {
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
        logger.error({ err: error }, "Failed to load config from database");
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
  const priceChanged =
    current.priceBdt !== config.priceBdt ||
    JSON.stringify(current.priceModifiers || {}) !== JSON.stringify(config.priceModifiers || {}) ||
    JSON.stringify(current.variants || []) !== JSON.stringify(config.variants || []);
  if (changed && !meta?.skipAudit) {
    await appendAudit({
      actor: meta?.actor,
      role: meta?.role,
      ip: meta?.ip,
      note: meta?.note,
      data: current
    });
    if (priceChanged) {
      try {
        const prisma = getPrisma() as any;
        await prisma.auditLog.create({
          data: {
            actor: meta?.actor || null,
            role: meta?.role || null,
            action: "price.update",
            data: { before: { priceBdt: current.priceBdt }, after: { priceBdt: config.priceBdt } }
          }
        });
      } catch (error) {
        console.error("Failed to write price audit", error);
      }
    }
  }
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        "insert into site_config (id, data, updated_at) values ($1, $2, now()) on conflict (id) do update set data = excluded.data, updated_at = now()",
        [configId, config]
      );
      if (config.features?.inventoryEnabled && config.variants?.length) {
        try {
          const prisma = getPrisma() as any;
          const baseName = config.productCardTitle?.en || config.brandName || "Landing Product";
          const product = await prisma.product.upsert({
            where: { sku: "LANDING-DEFAULT" },
            update: {
              name: baseName,
              brand: config.brandName || "Brand",
              category: config.products?.[0]?.category || "General",
              basePrice: config.priceBdt || 0,
              description: config.productBody?.en || ""
            },
            create: {
              name: baseName,
              brand: config.brandName || "Brand",
              category: config.products?.[0]?.category || "General",
              sku: "LANDING-DEFAULT",
              basePrice: config.priceBdt || 0,
              description: config.productBody?.en || "",
              type: "PHYSICAL"
            }
          });
          for (const variant of config.variants) {
            if (!variant.sku) continue;
            const optionName = Object.values(variant.optionValues || {}).join(" / ") || "Variant";
            await prisma.variant.upsert({
              where: { sku: variant.sku },
              update: {
                productId: product.id,
                name: optionName,
                price: variant.price,
                // stockQty is deliberately NOT updated here.
                //
                // The live count belongs to the database: reserveInventory
                // decrements it at checkout, releaseInventory restores it. The
                // config blob holds whatever value was typed when the variant
                // was created and is never written back, so syncing it on every
                // save reset stock to a stale figure — editing the hero title
                // restored units that were already sold, and the store oversold
                // by exactly the quantity committed since the variant was added.
                //
                // Stock is set once on create, then owned by the inventory and
                // batch endpoints.
                weight: variant.weight || null,
                imageUrl: variant.images?.[0] || null
              },
              create: {
                productId: product.id,
                name: optionName,
                price: variant.price,
                stockQty: variant.stockQty,
                weight: variant.weight || null,
                sku: variant.sku,
                imageUrl: variant.images?.[0] || null
              }
            });
          }
        } catch (error) {
          logger.error({ err: error }, "Failed to sync variants to database");
        }
      }
      return;
    } catch (error) {
      logger.error({ err: error }, "Failed to save config to database");
    }
  }

  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(dataPath, json, "utf8");
}
