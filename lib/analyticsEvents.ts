// Shared event vocabulary for the browser pixel and the server-side Conversions
// API.
//
// The funnel uses GA4-style names internally (view_item, add_to_cart, …). Meta
// expects its own standard names. The browser pixel translated them; the CAPI
// route did not, so the same action arrived at Meta twice under two different
// names — once as the standard "AddToCart" from the pixel and once as a custom
// "add_to_cart" event from the server. That breaks deduplication (Meta only
// dedupes when event_name AND event_id match) and leaves the server half
// unusable for optimisation, because custom events are not standard events.
//
// One map, imported by both, so they cannot drift again.

export const META_EVENT_NAMES: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  page_view: "PageView"
};

export function toMetaEventName(event: string): string | null {
  return META_EVENT_NAMES[event] || null;
}

// Fields that must never reach Meta's custom_data. Identifiers belong in
// user_data, hashed — sending them raw alongside is both redundant and a
// policy violation.
const PII_KEYS = new Set(["email", "phone", "name", "customerName", "address"]);

export function stripPii<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (PII_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
