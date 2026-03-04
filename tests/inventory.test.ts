import { describe, expect, test } from "vitest";
import { getPrisma } from "../lib/prisma";
import { reserveInventory } from "../lib/inventory";

const hasDb = !!process.env.DATABASE_URL;

if (!hasDb) {
  describe.skip("inventory", () => {
    test("requires database", () => {});
  });
} else {
  describe("inventory", () => {
    test("concurrent reservation prevents oversell", async () => {
      const prisma = getPrisma() as any;
      const variant = await prisma.variant.create({
        data: {
          product: {
            create: {
              name: "Test product",
              type: "PHYSICAL",
              category: "Test",
              brand: "Test",
              basePrice: 100,
              description: "Test"
            }
          },
          name: "Default",
          price: 100,
          stockQty: 1
        }
      });

      const results = await Promise.all([
        reserveInventory(variant.id, 1),
        reserveInventory(variant.id, 1)
      ]);

      const successCount = results.filter(Boolean).length;
      expect(successCount).toBe(1);
    });
  });
}
