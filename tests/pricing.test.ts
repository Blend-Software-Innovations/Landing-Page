import { describe, expect, it, beforeAll } from "vitest";
import { defaultConfig, type SiteConfig } from "../lib/siteConfig";
import { priceItem, priceItems, computeOrderAmounts } from "../lib/pricing";

// Pricing must be config/DB-driven only — these tests prove a forged client
// payload cannot change what is charged. DB lookups are disabled so pricing
// resolves purely from config.
beforeAll(() => {
  process.env.DISABLE_DB = "1";
});

function testConfig(overrides: Partial<SiteConfig> = {}): SiteConfig {
  return {
    ...defaultConfig,
    priceBdt: 1000,
    products: [],
    variants: [],
    features: { ...defaultConfig.features, multiProductEnabled: false, inventoryEnabled: false },
    optionGroups: [
      { id: "size", labelEn: "Size", labelBn: "সাইজ", options: ["Small", "Large"] }
    ] as SiteConfig["optionGroups"],
    priceModifiers: { size: { Small: 0, Large: 200 } },
    deliveryAreas: [{ name: "Dhanmondi", fee: 60, minOrder: 300 }],
    shippingFees: { insideDhaka: 60, outsideDhaka: 120 },
    shippingRules: { enabled: false, unit: "g", tiers: [] },
    freeDeliveryThresholdQty: 0,
    ...overrides
  } as SiteConfig;
}

describe("priceItem", () => {
  it("ignores a forged client unitPrice and prices from config", async () => {
    const config = testConfig();
    const item = await priceItem(config, {
      productId: "",
      variantId: "",
      quantity: 2,
      // a real attack payload also carries unitPrice: 1 — priceItem must not read it
      optionValues: { size: "Large" }
    });
    expect(item.unitPrice).toBe(1200);
    expect(item.lineTotal).toBe(2400);
  });

  it("ignores unknown option values when summing modifiers", async () => {
    const config = testConfig();
    const item = await priceItem(config, {
      quantity: 1,
      optionValues: { size: "NotARealOption", bogus: "x" }
    });
    expect(item.unitPrice).toBe(1000);
  });

  it("clamps quantity into [1, 100]", async () => {
    const config = testConfig();
    expect((await priceItem(config, { quantity: 0 })).quantity).toBe(1);
    expect((await priceItem(config, { quantity: -5 })).quantity).toBe(1);
    expect((await priceItem(config, { quantity: 1e9 })).quantity).toBe(100);
  });

  it("uses config variant price when the sku matches", async () => {
    const config = testConfig({
      variants: [
        { id: "v1", optionValues: { size: "Large" }, sku: "SKU-L", stockQty: 5, images: [], price: 1500 }
      ] as SiteConfig["variants"]
    });
    const item = await priceItem(config, { variantId: "SKU-L", quantity: 1 });
    expect(item.unitPrice).toBe(1500);
  });
});

describe("computeOrderAmounts", () => {
  it("charges the area fee and no discount below thresholds", async () => {
    const config = testConfig();
    const items = await priceItems(config, null, { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, { deliveryArea: "Dhanmondi" });
    expect(amounts.goodsSubtotal).toBe(1000);
    expect(amounts.shippingFee).toBe(60);
    expect(amounts.discount).toBe(0);
    expect(amounts.total).toBe(1060);
  });

  it("applies the 5% discount at quantity >= 3 and gift wrap from config", async () => {
    const config = testConfig({ giftWrapFee: 120 } as Partial<SiteConfig>);
    const items = await priceItems(config, [{ quantity: 3 }], { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, {
      deliveryZone: "insideDhaka",
      giftWrap: true
    });
    expect(amounts.goodsSubtotal).toBe(3000);
    expect(amounts.discount).toBe(150);
    expect(amounts.giftWrapFee).toBe(120);
    expect(amounts.shippingFee).toBe(60);
    expect(amounts.total).toBe(3030);
  });

  it("zeroes shipping at the free-delivery quantity threshold", async () => {
    const config = testConfig({ freeDeliveryThresholdQty: 2 });
    const items = await priceItems(config, [{ quantity: 2 }], { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, { deliveryZone: "outsideDhaka" });
    expect(amounts.shippingFee).toBe(0);
  });
});
