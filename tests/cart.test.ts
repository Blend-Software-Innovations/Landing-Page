import { describe, expect, it } from "vitest";
import {
  normalizeQuantity,
  setLineQuantity,
  upsertCartLine,
  removeLine,
  cartSubtotal,
  cartQuantity,
  MAX_QTY_PER_LINE,
  type CartLine
} from "../lib/cart";

const line = (over: Partial<CartLine> = {}): CartLine => ({
  id: "default-base-",
  name: "Ice Portable Fan Pro",
  productId: "default-product",
  variantId: "",
  optionValues: {},
  quantity: 1,
  unitPrice: 680,
  weightPerUnit: 0,
  ...over
});

describe("normalizeQuantity", () => {
  it("clamps everything a number input can produce", () => {
    expect(normalizeQuantity(3)).toBe(3);
    expect(normalizeQuantity(0)).toBe(1);
    expect(normalizeQuantity(-5)).toBe(1);
    expect(normalizeQuantity("")).toBe(1); // cleared field
    expect(normalizeQuantity("abc")).toBe(1); // pasted junk -> NaN
    expect(normalizeQuantity(2.9)).toBe(2); // decimals floored
    expect(normalizeQuantity(1e9)).toBe(MAX_QTY_PER_LINE);
  });
});

describe("setLineQuantity", () => {
  it("updates the matching line so the box and the cart agree", () => {
    const cart = [line({ id: "a", quantity: 2 })];
    expect(setLineQuantity(cart, "a", 5)[0].quantity).toBe(5);
  });

  it("is the regression guard: quantity must not be ignored once the cart is filled", () => {
    // The reported bug: with an item in the cart, changing the quantity box left
    // the subtotal frozen because nothing propagated to the cart line.
    const cart = [line({ id: "a", quantity: 2, unitPrice: 680 })];
    expect(cartSubtotal(cart)).toBe(1360);
    const after = setLineQuantity(cart, "a", 5);
    expect(cartSubtotal(after)).toBe(3400);
  });

  it("clamps through the same rules", () => {
    const cart = [line({ id: "a", quantity: 2 })];
    expect(setLineQuantity(cart, "a", 0)[0].quantity).toBe(1);
    expect(setLineQuantity(cart, "a", -3)[0].quantity).toBe(1);
    expect(setLineQuantity(cart, "a", 9999)[0].quantity).toBe(MAX_QTY_PER_LINE);
  });

  it("returns the same reference when the id is absent", () => {
    const cart = [line({ id: "a" })];
    expect(setLineQuantity(cart, "missing", 4)).toBe(cart);
  });

  it("touches only the targeted line", () => {
    const cart = [line({ id: "a", quantity: 2 }), line({ id: "b", quantity: 3 })];
    const after = setLineQuantity(cart, "a", 7);
    expect(after[0].quantity).toBe(7);
    expect(after[1].quantity).toBe(3);
  });
});

describe("upsertCartLine", () => {
  it("appends a line that is not present", () => {
    expect(upsertCartLine([], line({ quantity: 2 }))).toHaveLength(1);
  });

  it("SETS rather than doubles when adding the same selection twice", () => {
    // Pressing "add to cart" twice at quantity 5 must leave 5, not 10 — the box
    // is the source of truth for the current selection.
    const once = upsertCartLine([], line({ id: "a", quantity: 5 }));
    const twice = upsertCartLine(once, line({ id: "a", quantity: 5 }));
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(5);
  });

  it("keeps distinct selections as separate lines", () => {
    const cart = upsertCartLine([], line({ id: "a" }));
    expect(upsertCartLine(cart, line({ id: "b" }))).toHaveLength(2);
  });
});

describe("totals", () => {
  it("sums price and quantity across lines", () => {
    const cart = [line({ id: "a", quantity: 2, unitPrice: 680 }), line({ id: "b", quantity: 3, unitPrice: 100 })];
    expect(cartSubtotal(cart)).toBe(1660);
    expect(cartQuantity(cart)).toBe(5);
    expect(cartSubtotal([])).toBe(0);
    expect(cartQuantity([])).toBe(0);
  });

  it("drops a removed line from the totals", () => {
    const cart = [line({ id: "a", quantity: 2 }), line({ id: "b", quantity: 1 })];
    expect(cartQuantity(removeLine(cart, "a"))).toBe(1);
  });
});
