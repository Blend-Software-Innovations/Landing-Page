import { describe, expect, it } from "vitest";
import { deepMerge } from "../lib/siteConfig.server";
import { defaultConfig } from "../lib/siteConfig";
import type { SiteConfig } from "../lib/siteConfig";

// Regression guard for the admin config write path.
//
// saveConfig replaces the whole site_config blob, and the route only stripped
// UNKNOWN keys — it never required known ones to be present. A partial body
// therefore replaced the entire row, and getConfig merged that over
// defaultConfig, so the live store silently reverted to defaults with a 200 OK.
// The panel autosaves on a timer, so a single truncated request was enough.
//
// The route now merges onto the current config; these pin that behaviour.

const live = (): SiteConfig => ({
  ...defaultConfig,
  brandName: "Ice Portable Fan Pro",
  priceBdt: 680,
  products: [
    {
      id: "default-product",
      name: "Ice Portable Fan Pro",
      subtitle: "16°C cooling plate",
      description: "desc",
      basePrice: 680,
      category: "Gadget",
      stock: 20,
      outOfStock: false,
      badge: "Best seller"
    }
  ],
  deliveryAreas: [{ name: "Dhanmondi", fee: 60, minOrder: 300 }],
  bundles: [{ quantity: 2, discountPercent: 10 }]
});

describe("admin config merge", () => {
  it("a partial write cannot erase the rest of the store", () => {
    const merged = deepMerge(live(), { priceBdt: 1 } as Partial<SiteConfig>);
    expect(merged.priceBdt).toBe(1);
    // Everything the partial body omitted must survive.
    expect(merged.brandName).toBe("Ice Portable Fan Pro");
    expect(merged.products).toHaveLength(1);
    expect(merged.deliveryAreas).toHaveLength(1);
    expect(merged.bundles).toHaveLength(1);
  });

  it("an empty body changes nothing at all", () => {
    const before = live();
    const merged = deepMerge(before, {} as Partial<SiteConfig>);
    expect(merged).toEqual(before);
  });

  it("still replaces arrays wholesale, so removing an item keeps working", () => {
    // The panel always sends the full array, so a removal must not be
    // re-merged back in from the previous value.
    const merged = deepMerge(live(), { bundles: [] } as Partial<SiteConfig>);
    expect(merged.bundles).toEqual([]);

    const swapped = deepMerge(live(), {
      deliveryAreas: [{ name: "Mirpur", fee: 80 }]
    } as Partial<SiteConfig>);
    expect(swapped.deliveryAreas).toEqual([{ name: "Mirpur", fee: 80 }]);
  });

  it("merges nested objects field by field", () => {
    const merged = deepMerge(live(), { heroTitle: { bn: "নতুন" } } as unknown as Partial<SiteConfig>);
    expect(merged.heroTitle.bn).toBe("নতুন");
    // The English side was not sent and must be preserved.
    expect(merged.heroTitle.en).toBe(defaultConfig.heroTitle.en);
  });

  it("ignores undefined values rather than blanking the field", () => {
    const merged = deepMerge(live(), { brandName: undefined } as Partial<SiteConfig>);
    expect(merged.brandName).toBe("Ice Portable Fan Pro");
  });

  it("applies a real multi-field edit correctly", () => {
    const merged = deepMerge(live(), {
      brandName: "New Name",
      bundles: [
        { quantity: 2, discountPercent: 12 },
        { quantity: 3, discountPercent: 18, freeDelivery: true }
      ]
    } as Partial<SiteConfig>);
    expect(merged.brandName).toBe("New Name");
    expect(merged.bundles).toHaveLength(2);
    expect(merged.bundles[1].freeDelivery).toBe(true);
    expect(merged.priceBdt).toBe(680);
  });
});
