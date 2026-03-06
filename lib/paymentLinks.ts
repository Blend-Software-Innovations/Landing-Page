import type { SiteConfig } from "./siteConfig";

type Provider = "bkash" | "nagad" | "rocket";

export function buildPaymentLink(
  provider: Provider,
  payload: { orderId: string; amount: number; phone?: string },
  config: SiteConfig
) {
  const base =
    provider === "bkash"
      ? config.paymentLinks?.bkash
      : provider === "nagad"
      ? config.paymentLinks?.nagad
      : config.paymentLinks?.rocket;
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("amount", String(payload.amount));
    url.searchParams.set("orderId", payload.orderId);
    if (payload.phone) url.searchParams.set("phone", payload.phone);
    return url.toString();
  } catch {
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}amount=${encodeURIComponent(
      String(payload.amount)
    )}&orderId=${encodeURIComponent(payload.orderId)}${payload.phone ? `&phone=${encodeURIComponent(payload.phone)}` : ""}`;
  }
}
