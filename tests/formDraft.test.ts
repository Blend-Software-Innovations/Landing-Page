import { describe, expect, it, beforeEach, vi } from "vitest";
import { loadDraft, saveDraft, clearDraft } from "../lib/formDraft";

// Minimal localStorage stand-in — these tests are about the draft rules, not the
// browser API.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k)
    }
  });
});

describe("order form draft", () => {
  it("round-trips the customer's details so a refresh does not lose them", () => {
    saveDraft({
      fields: { name: "Rahim", phone: "01676286325", address: "House 12, Road 3" },
      district: "Dhaka",
      thana: "Dhanmondi",
      quantity: 2
    });
    const draft = loadDraft();
    expect(draft?.fields.name).toBe("Rahim");
    expect(draft?.fields.phone).toBe("01676286325");
    expect(draft?.district).toBe("Dhaka");
    expect(draft?.thana).toBe("Dhanmondi");
    expect(draft?.quantity).toBe(2);
  });

  it("never persists payment fields — they belong to a single attempt", () => {
    saveDraft({
      fields: { name: "Rahim", transactionId: "ABC12345678", paidAmount: "740" }
    });
    const draft = loadDraft();
    expect(draft?.fields.name).toBe("Rahim");
    expect(draft?.fields.transactionId).toBeUndefined();
    expect(draft?.fields.paidAmount).toBeUndefined();
  });

  it("drops payment fields even if they were already in storage", () => {
    store.set(
      "order_draft_v1",
      JSON.stringify({ fields: { name: "Rahim", transactionId: "SNEAKY123456" } })
    );
    expect(loadDraft()?.fields.transactionId).toBeUndefined();
  });

  it("returns null for missing or corrupt storage instead of throwing", () => {
    expect(loadDraft()).toBeNull();
    store.set("order_draft_v1", "{not json");
    expect(loadDraft()).toBeNull();
    store.set("order_draft_v1", JSON.stringify("a string"));
    expect(loadDraft()).toBeNull();
  });

  it("ignores non-string field values rather than rendering them", () => {
    store.set("order_draft_v1", JSON.stringify({ fields: { name: { evil: true }, city: "Dhaka" } }));
    const draft = loadDraft();
    expect(draft?.fields.name).toBeUndefined();
    expect(draft?.fields.city).toBe("Dhaka");
  });

  it("clears completely once the order is placed", () => {
    saveDraft({ fields: { name: "Rahim" } });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
