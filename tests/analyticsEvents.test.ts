import { describe, expect, it } from "vitest";
import { toMetaEventName, stripPii, META_EVENT_NAMES } from "../lib/analyticsEvents";

describe("Meta event names", () => {
  it("translates every funnel event to a Meta standard name", () => {
    expect(toMetaEventName("view_item")).toBe("ViewContent");
    expect(toMetaEventName("add_to_cart")).toBe("AddToCart");
    expect(toMetaEventName("begin_checkout")).toBe("InitiateCheckout");
    expect(toMetaEventName("purchase")).toBe("Purchase");
    expect(toMetaEventName("page_view")).toBe("PageView");
  });

  it("returns null for anything unmapped, so it is dropped rather than sent as a custom event", () => {
    expect(toMetaEventName("ab_exposure")).toBeNull();
    expect(toMetaEventName("")).toBeNull();
  });

  it("uses names Meta recognises as standard events", () => {
    // Deduplication requires the browser pixel and the server CAPI call to send
    // the SAME event_name; optimisation requires it to be a standard name.
    const standard = ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "PageView"];
    for (const name of Object.values(META_EVENT_NAMES)) {
      expect(standard).toContain(name);
    }
  });
});

describe("stripPii", () => {
  it("removes identifiers from custom_data — they belong in user_data, hashed", () => {
    const cleaned = stripPii({
      email: "a@b.com",
      phone: "01711111111",
      name: "Rahim",
      address: "House 12",
      currency: "BDT",
      value: 1360
    });
    expect(cleaned).toEqual({ currency: "BDT", value: 1360 });
  });

  it("keeps the commerce fields Meta actually optimises on", () => {
    const cleaned = stripPii({ currency: "BDT", value: 680, items: [{ item_id: "p1" }], utm: { source: "fb" } });
    expect(cleaned.currency).toBe("BDT");
    expect(cleaned.value).toBe(680);
    expect(cleaned.items).toBeDefined();
    expect(cleaned.utm).toBeDefined();
  });

  it("survives an empty or odd payload", () => {
    expect(stripPii({})).toEqual({});
    expect(stripPii({ customerName: "x", ok: 1 })).toEqual({ ok: 1 });
  });
});
