import type { SiteConfig } from "./siteConfig";

export type OrderInput = {
  quantity: number;
  giftWrap: boolean;
  deliveryZone: "insideDhaka" | "outsideDhaka";
  selectedOptions: Record<string, string>;
  productId?: string;
};

export type PricingBreakdown = {
  unitPrice: number;
  subtotal: number;
  giftWrapFee: number;
  shippingFee: number;
  total: number;
  optionFees: Record<string, number>;
  selectedOptions: Record<string, string>;
};

export function calculatePricing(config: SiteConfig, input: OrderInput): PricingBreakdown {
  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 1;
  const activeProduct = config.features?.multiProductEnabled
    ? config.products?.find((product) => product.id === input.productId) ||
      config.products?.find((product) => product.id === config.activeProductId) ||
      config.products?.[0]
    : null;
  const basePrice = activeProduct?.basePrice ?? config.priceBdt ?? 0;
  const optionFees: Record<string, number> = {};
  const selectedOptions: Record<string, string> = {};
  let optionsTotal = 0;

  config.optionGroups.forEach((group) => {
    const selected = input.selectedOptions[group.id];
    if (!selected) return;
    if (!group.options.includes(selected)) return;
    const fee = config.priceModifiers?.[group.id]?.[selected] ?? 0;
    optionFees[group.id] = fee;
    selectedOptions[group.id] = selected;
    optionsTotal += fee;
  });

  const unitPrice = basePrice + optionsTotal;
  const subtotal = unitPrice * quantity;
  const giftWrapFee = input.giftWrap ? 120 : 0;
  const rawShippingFee =
    input.deliveryZone === "insideDhaka"
      ? config.shippingFees?.insideDhaka ?? 0
      : config.shippingFees?.outsideDhaka ?? 0;
  const freeDeliveryQty = config.freeDeliveryThresholdQty ?? 0;
  const shippingFee = freeDeliveryQty > 0 && quantity >= freeDeliveryQty ? 0 : rawShippingFee;
  const total = subtotal + giftWrapFee + shippingFee;

  return {
    unitPrice,
    subtotal,
    giftWrapFee,
    shippingFee,
    total,
    optionFees,
    selectedOptions
  };
}
