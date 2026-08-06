import { describe, expect, it, beforeAll } from "vitest";
import { defaultConfig, type SiteConfig } from "../lib/siteConfig";
import { resolveBundleTier, resolveOrderDiscount, bundleFreeDelivery } from "../lib/priceFromConfig";
import { priceItems, computeOrderAmounts } from "../lib/pricing";

beforeAll(() => {
  process.env.DISABLE_DB = "1";
});

const cfg = (over: Partial<SiteConfig> = {}): SiteConfig =>
  ({
    ...defaultConfig,
    priceBdt: 680,
    products: [],
    variants: [],
    optionGroups: [],
    priceModifiers: {},
    features: { ...defaultConfig.features, multiProductEnabled: false, inventoryEnabled: false },
    shippingFees: { insideDhaka: 60, outsideDhaka: 120 },
    shippingRules: { enabled: false, unit: "g", tiers: [] },
    freeDeliveryThresholdQty: 0,
    deliveryAreas: [],
    bundles: [
      { quantity: 2, discountPercent: 10 },
      { quantity: 3, discountPercent: 15, freeDelivery: true }
    ],
    ...over
  }) as SiteConfig;

describe("bundle tiers", () => {
  it("picks the highest tier the quantity reaches", () => {
    expect(resolveBundleTier(cfg(), 1)).toBeNull();
    expect(resolveBundleTier(cfg(), 2)?.discountPercent).toBe(10);
    expect(resolveBundleTier(cfg(), 3)?.discountPercent).toBe(15);
    expect(resolveBundleTier(cfg(), 9)?.discountPercent).toBe(15);
  });

  it("sorts tiers rather than trusting config order", () => {
    const scrambled = cfg({
      bundles: [
        { quantity: 3, discountPercent: 15 },
        { quantity: 2, discountPercent: 10 }
      ]
    });
    expect(resolveBundleTier(scrambled, 2)?.discountPercent).toBe(10);
    expect(resolveBundleTier(scrambled, 3)?.discountPercent).toBe(15);
  });

  it("does not stack the tier discount with the legacy blanket rule", () => {
    // 3 units also satisfies the old "qty >= 3 → 5%" rule. Applying both would
    // hand over 20%.
    const subtotal = 680 * 3;
    expect(resolveOrderDiscount(cfg(), subtotal, 3)).toBe(Math.round(subtotal * 0.15));
  });

  it("falls back to the legacy rule when no bundles are configured", () => {
    const noBundles = cfg({ bundles: [] });
    expect(resolveOrderDiscount(noBundles, 2040, 3)).toBe(Math.round(2040 * 0.05));
  });

  it("waives delivery only from the tier that says so", () => {
    expect(bundleFreeDelivery(cfg(), 2)).toBe(false);
    expect(bundleFreeDelivery(cfg(), 3)).toBe(true);
  });

  it("clamps an absurd configured percentage", () => {
    const silly = cfg({ bundles: [{ quantity: 2, discountPercent: 500 }] });
    expect(resolveOrderDiscount(silly, 1000, 2)).toBe(900);
  });

  it("ignores malformed tiers instead of throwing", () => {
    const bad = cfg({ bundles: [{ quantity: 0, discountPercent: 10 }, { quantity: 2 } as any] });
    expect(() => resolveOrderDiscount(bad, 1000, 5)).not.toThrow();
  });
});

describe("bundle pricing end to end", () => {
  it("charges the tier price the buyer was shown", async () => {
    const config = cfg();
    const items = await priceItems(config, [{ quantity: 3 }], { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, { district: "Dhaka", thana: "Dhanmondi" });
    expect(amounts.goodsSubtotal).toBe(2040);
    expect(amounts.discount).toBe(306); // 15%
    expect(amounts.shippingFee).toBe(0); // tier waives delivery
    expect(amounts.total).toBe(1734);
  });

  it("gives no tier discount to a single unit", async () => {
    const config = cfg();
    const items = await priceItems(config, [{ quantity: 1 }], { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, { district: "Dhaka", thana: "Dhanmondi" });
    expect(amounts.discount).toBe(0);
    expect(amounts.shippingFee).toBe(60);
    expect(amounts.total).toBe(740);
  });

  it("cannot be talked into a tier by the request body", async () => {
    const config = cfg();
    // One unit, but the payload claims the 3-unit tier's numbers.
    const items = await priceItems(config, [{ quantity: 1, unitPrice: 1 }], { quantity: 1 });
    const amounts = computeOrderAmounts(config, items, {
      district: "Dhaka",
      thana: "Dhanmondi",
      deliveryZone: "insideDhaka"
    });
    expect(amounts.goodsSubtotal).toBe(680);
    expect(amounts.discount).toBe(0);
    expect(amounts.total).toBe(740);
  });
});
