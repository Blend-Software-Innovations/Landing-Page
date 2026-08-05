import { describe, expect, it } from "vitest";
import { toOrderItemRows } from "../lib/orders";
import type { PricedItem } from "../lib/pricing";

// The OrderItem table has exactly these columns. Prisma's nested create throws
// on anything else, so this set is the contract.
const ORDER_ITEM_COLUMNS = ["productId", "variantId", "quantity", "unitPrice", "lineTotal"].sort();

describe("toOrderItemRows", () => {
  it("strips the extra fields that made every order a 500", () => {
    // This is exactly what lib/pricing.ts hands the order endpoints. `name` and
    // `weightPerUnit` are not columns on OrderItem; passing them through to
    // prisma.order.create threw and broke checkout entirely.
    const priced: PricedItem = {
      name: "Ice Portable Fan Pro",
      productId: "default-product",
      variantId: "",
      quantity: 2,
      unitPrice: 680,
      lineTotal: 1360,
      weightPerUnit: 350
    };
    const rows = toOrderItemRows({ items: [priced as unknown as Record<string, unknown>] });
    expect(Object.keys(rows[0]).sort()).toEqual(ORDER_ITEM_COLUMNS);
    expect(rows[0]).not.toHaveProperty("name");
    expect(rows[0]).not.toHaveProperty("weightPerUnit");
  });

  it("keeps the values intact while stripping", () => {
    const rows = toOrderItemRows({
      items: [{ name: "x", productId: "p1", variantId: "SKU-1", quantity: 2, unitPrice: 680, lineTotal: 1360 }]
    });
    expect(rows[0]).toEqual({
      productId: "p1",
      variantId: "SKU-1",
      quantity: 2,
      unitPrice: 680,
      lineTotal: 1360
    });
  });

  it("never emits a column outside the schema, whatever it is handed", () => {
    const rows = toOrderItemRows({
      items: [{ productId: "p", quantity: 1, unitPrice: 1, lineTotal: 1, somethingNew: true, id: "cart-line-id" }]
    });
    expect(Object.keys(rows[0]).sort()).toEqual(ORDER_ITEM_COLUMNS);
  });

  it("falls back to the top-level fields when no items are given", () => {
    const rows = toOrderItemRows({ productId: "p1", variantId: null, quantity: 3, unitPrice: 100, total: 300 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ productId: "p1", variantId: null, quantity: 3, unitPrice: 100, lineTotal: 300 });
  });

  it("normalises an empty variantId to null so the optional column stays clean", () => {
    expect(toOrderItemRows({ items: [{ productId: "p", variantId: "", quantity: 1, unitPrice: 5 }] })[0].variantId).toBeNull();
  });

  it("derives lineTotal when it is missing", () => {
    expect(toOrderItemRows({ items: [{ productId: "p", quantity: 3, unitPrice: 200 }] })[0].lineTotal).toBe(600);
  });

  it("coerces junk to values the Int columns accept", () => {
    const rows = toOrderItemRows({
      items: [{ productId: "p", quantity: "abc", unitPrice: 12.7, lineTotal: undefined }]
    });
    expect(rows[0].quantity).toBe(1);
    expect(rows[0].unitPrice).toBe(13);
    expect(Number.isInteger(rows[0].lineTotal)).toBe(true);
  });

  it("maps every line of a multi-item cart", () => {
    const rows = toOrderItemRows({
      items: [
        { name: "a", productId: "p1", quantity: 1, unitPrice: 100, lineTotal: 100, weightPerUnit: 10 },
        { name: "b", productId: "p2", quantity: 2, unitPrice: 50, lineTotal: 100, weightPerUnit: 20 }
      ]
    });
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(ORDER_ITEM_COLUMNS);
  });
});
