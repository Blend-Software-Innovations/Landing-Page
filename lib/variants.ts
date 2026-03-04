import type { OptionGroup, SiteConfig } from "./siteConfig";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type MaterializedVariant = SiteConfig["variants"][number];

export function materializeVariants(
  optionGroups: OptionGroup[],
  basePrice: number,
  priceModifiers: Record<string, Record<string, number>>
): MaterializedVariant[] {
  if (!optionGroups.length) return [];

  const groups = optionGroups.map((group) => ({
    id: group.id,
    options: group.options.length ? group.options : ["Default"]
  }));

  const combos: Record<string, string>[] = [];
  const walk = (index: number, acc: Record<string, string>) => {
    if (index >= groups.length) {
      combos.push({ ...acc });
      return;
    }
    const group = groups[index];
    group.options.forEach((option) => {
      acc[group.id] = option;
      walk(index + 1, acc);
    });
  };
  walk(0, {});

  return combos.map((combo) => {
    const modifier = Object.entries(combo).reduce((sum, [groupId, value]) => {
      return sum + (priceModifiers?.[groupId]?.[value] || 0);
    }, 0);
    const suffix = Object.values(combo).map((value) => slugify(value)).join("-");
    return {
      id: `var-${suffix || "default"}`,
      optionValues: combo,
      sku: `SKU-${suffix || "default"}`.toUpperCase(),
      stockQty: 0,
      weight: undefined,
      images: [],
      price: basePrice + modifier
    };
  });
}
