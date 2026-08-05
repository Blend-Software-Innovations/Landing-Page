import type { SiteConfig } from "./siteConfig";

// Pure, config-only pricing shared by the storefront and the order APIs.
//
// It lives apart from lib/pricing.ts because that module imports Prisma and must
// never reach the client bundle. Keeping the rules here means the quote a buyer
// sees and the amount the server charges come from one implementation instead of
// two hand-synced copies — the discount rule in particular used to be a magic
// number duplicated in both files, where any edit to one silently created a
// quote/charge mismatch.

export const DISCOUNT_RATE = 0.05;
export const DISCOUNT_MIN_SUBTOTAL = 10000;
export const DISCOUNT_MIN_QUANTITY = 3;

export function basePriceFor(config: SiteConfig, productId: string): number {
  if (config.features?.multiProductEnabled) {
    const product =
      (productId ? config.products?.find((p) => p.id === productId) : undefined) ||
      config.products?.find((p) => p.id === config.activeProductId) ||
      config.products?.[0];
    if (product && Number.isFinite(product.basePrice)) return product.basePrice;
  }
  return Number.isFinite(config.priceBdt) ? config.priceBdt : 0;
}

export function optionFeesFor(config: SiteConfig, optionValues: Record<string, string>): number {
  let total = 0;
  for (const group of config.optionGroups || []) {
    const selected = optionValues[group.id];
    // Skip values that no longer exist on the group, so a stale cart line cannot
    // keep charging for an option the admin has since removed.
    if (!selected || !group.options.includes(selected)) continue;
    const fee = config.priceModifiers?.[group.id]?.[selected];
    if (Number.isFinite(fee)) total += Number(fee);
  }
  return total;
}

/** Unit price from config alone. The server additionally prefers a DB variant
 *  row when one exists; see lib/pricing.ts. */
export function unitPriceFromConfig(
  config: SiteConfig,
  input: { productId?: string; variantId?: string; optionValues?: Record<string, string> }
): number {
  const variantId = String(input.variantId || "");
  if (variantId) {
    const cfgVariant = (config.variants || []).find((v) => v.sku === variantId || v.id === variantId);
    if (cfgVariant && Number.isFinite(cfgVariant.price)) return Math.max(0, Math.round(cfgVariant.price));
  }
  const base = basePriceFor(config, String(input.productId || ""));
  const fees = optionFeesFor(config, input.optionValues || {});
  return Math.max(0, Math.round(base + fees));
}

export function orderDiscount(goodsSubtotal: number, totalQuantity: number): number {
  const qualifies = goodsSubtotal >= DISCOUNT_MIN_SUBTOTAL || totalQuantity >= DISCOUNT_MIN_QUANTITY;
  return qualifies ? Math.round(goodsSubtotal * DISCOUNT_RATE) : 0;
}
