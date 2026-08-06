import { describe, expect, it } from "vitest";

// The bar's rules, mirrored from components/StockBar.tsx. Kept as pure maths so
// the honesty guarantees are testable without a DOM renderer: the COUNT is the
// real stock, and only the FILL is relative to the baseline.
function bar(stock: number | null | undefined, baseline: number) {
  if (typeof stock !== "number" || !Number.isFinite(stock) || stock <= 0) return null;
  const max = Math.max(1, baseline || 50);
  return {
    pct: Math.max(6, Math.min(100, Math.round((stock / max) * 100))),
    low: stock <= Math.max(1, Math.round(max * 0.2)),
    count: stock
  };
}

describe("stock indicator", () => {
  it("hides itself when there is nothing real to show", () => {
    expect(bar(0, 50)).toBeNull();
    expect(bar(-5, 50)).toBeNull();
    expect(bar(null, 50)).toBeNull();
    expect(bar(undefined, 50)).toBeNull();
    expect(bar(NaN, 50)).toBeNull();
  });

  it("always reports the true count, never a scaled or invented one", () => {
    // The whole point: a buyer who reloads and counts must find the same number.
    expect(bar(37, 50)?.count).toBe(37);
    expect(bar(400, 50)?.count).toBe(400);
    expect(bar(1, 50)?.count).toBe(1);
  });

  it("fills proportionally to the baseline", () => {
    expect(bar(50, 50)?.pct).toBe(100);
    expect(bar(25, 50)?.pct).toBe(50);
    expect(bar(10, 100)?.pct).toBe(10);
  });

  it("caps the fill at 100% when stock exceeds the baseline", () => {
    expect(bar(500, 50)?.pct).toBe(100);
  });

  it("keeps a sliver visible at very low stock so the bar never looks broken", () => {
    expect(bar(1, 500)?.pct).toBe(6);
  });

  it("warns only under a fifth of the baseline", () => {
    expect(bar(11, 50)?.low).toBe(false);
    expect(bar(10, 50)?.low).toBe(true);
    expect(bar(1, 50)?.low).toBe(true);
  });

  it("survives a zero or missing baseline", () => {
    expect(() => bar(10, 0)).not.toThrow();
    expect(bar(10, 0)?.pct).toBe(20); // falls back to 50
  });
});
