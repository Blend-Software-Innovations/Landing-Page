import type { SiteConfig } from "./siteConfig";
import { getPrisma } from "./prisma";
import { isDbAvailable } from "./db";

// Server-side pricing. Client-submitted unitPrice/total/fees are display-only;
// every order-creating endpoint must price items from config + DB via this
// module so a forged payload can never change what is charged.

export type IncomingOrderItem = {
  name?: unknown;
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
  optionValues?: unknown;
};

export type PricedItem = {
  name: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  weightPerUnit: number;
};

export type OrderAmounts = {
  items: PricedItem[];
  goodsSubtotal: number;
  giftWrapFee: number;
  shippingFee: number;
  discount: number;
  total: number;
};

const MAX_QTY_PER_ITEM = 100;
const MAX_ITEMS_PER_ORDER = 50;

function clampQuantity(value: unknown): number {
  const qty = Math.floor(Number(value || 1));
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(qty, MAX_QTY_PER_ITEM);
}

async function findDbVariant(idOrSku: string) {
  if (!idOrSku || !isDbAvailable()) return null;
  try {
    const prisma = getPrisma() as any;
    const byId = await prisma.variant.findUnique({ where: { id: idOrSku } });
    if (byId) return byId;
    return await prisma.variant.findUnique({ where: { sku: idOrSku } });
  } catch {
    return null;
  }
}

function basePriceFor(config: SiteConfig, productId: string): number {
  if (config.features?.multiProductEnabled) {
    const product =
      (productId ? config.products?.find((p) => p.id === productId) : undefined) ||
      config.products?.find((p) => p.id === config.activeProductId) ||
      config.products?.[0];
    if (product && Number.isFinite(product.basePrice)) return product.basePrice;
  }
  return Number.isFinite(config.priceBdt) ? config.priceBdt : 0;
}

function optionFeesFor(config: SiteConfig, optionValues: Record<string, string>): number {
  let total = 0;
  for (const group of config.optionGroups || []) {
    const selected = optionValues[group.id];
    if (!selected || !group.options.includes(selected)) continue;
    const fee = config.priceModifiers?.[group.id]?.[selected];
    if (Number.isFinite(fee)) total += Number(fee);
  }
  return total;
}

export async function priceItem(config: SiteConfig, item: IncomingOrderItem): Promise<PricedItem> {
  const quantity = clampQuantity(item.quantity);
  const productId = String(item.productId || "");
  const variantId = String(item.variantId || "");
  const optionValues =
    item.optionValues && typeof item.optionValues === "object" && !Array.isArray(item.optionValues)
      ? (item.optionValues as Record<string, string>)
      : {};

  let unitPrice: number | null = null;
  let weightPerUnit = 0;
  let name = String(item.name || "").slice(0, 200);

  if (variantId) {
    const dbVariant = await findDbVariant(variantId);
    if (dbVariant && Number.isFinite(dbVariant.price)) {
      unitPrice = dbVariant.price;
      weightPerUnit = Number(dbVariant.weight || 0);
      if (!name) name = String(dbVariant.name || "");
    } else {
      const cfgVariant = (config.variants || []).find((v) => v.sku === variantId || v.id === variantId);
      if (cfgVariant && Number.isFinite(cfgVariant.price)) {
        unitPrice = cfgVariant.price;
        weightPerUnit = Number(cfgVariant.weight || 0);
      }
    }
  }

  if (unitPrice === null) {
    unitPrice = basePriceFor(config, productId) + optionFeesFor(config, optionValues);
  }

  unitPrice = Math.max(0, Math.round(unitPrice));
  if (!name) name = config.productCardTitle?.en || "Product";

  return {
    name,
    productId,
    variantId,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
    weightPerUnit
  };
}

export async function priceItems(
  config: SiteConfig,
  itemsRaw: unknown,
  fallback: IncomingOrderItem
): Promise<PricedItem[]> {
  const list = Array.isArray(itemsRaw) && itemsRaw.length ? (itemsRaw as IncomingOrderItem[]) : [fallback];
  const priced: PricedItem[] = [];
  for (const item of list.slice(0, MAX_ITEMS_PER_ORDER)) {
    priced.push(await priceItem(config, item));
  }
  return priced;
}

// Mirrors the storefront math in pages/index.tsx so the quoted total and the
// charged total agree; the server result is authoritative.
export function computeOrderAmounts(
  config: SiteConfig,
  items: PricedItem[],
  opts: { deliveryArea?: string; deliveryZone?: string; giftWrap?: boolean }
): OrderAmounts {
  const goodsSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + item.weightPerUnit * item.quantity, 0);

  const giftWrapFee = opts.giftWrap ? Number((config as any).giftWrapFee ?? 120) : 0;

  const areaCfg = (config.deliveryAreas || []).find((a) => a.name === opts.deliveryArea);
  let rawShippingFee: number;
  if (areaCfg) {
    rawShippingFee = areaCfg.fee;
  } else {
    const rules = config.shippingRules;
    const insideDhaka = opts.deliveryZone === "insideDhaka";
    if (rules?.enabled && rules.tiers?.length) {
      const sorted = [...rules.tiers].sort((a, b) => a.maxWeight - b.maxWeight);
      const tier = sorted.find((t) => totalWeight <= t.maxWeight) || sorted[sorted.length - 1];
      rawShippingFee = insideDhaka ? tier.insideDhaka : tier.outsideDhaka;
    } else {
      rawShippingFee = insideDhaka
        ? config.shippingFees?.insideDhaka ?? 0
        : config.shippingFees?.outsideDhaka ?? 0;
    }
  }
  const freeDeliveryQty = config.freeDeliveryThresholdQty ?? 0;
  const shippingFee = freeDeliveryQty > 0 && totalQuantity >= freeDeliveryQty ? 0 : rawShippingFee;

  const discount = goodsSubtotal >= 10000 || totalQuantity >= 3 ? Math.round(goodsSubtotal * 0.05) : 0;
  const total = goodsSubtotal + giftWrapFee + shippingFee - discount;

  return { items, goodsSubtotal, giftWrapFee, shippingFee, discount, total };
}
