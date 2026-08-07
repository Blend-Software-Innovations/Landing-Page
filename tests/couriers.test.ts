import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { codAmountFor, parcelWeightKg, fullAddress, localPhone, configuredCouriers } from "../lib/couriers";

const KEYS = [
  "STEADFAST_API_KEY",
  "STEADFAST_SECRET_KEY",
  "STEADFAST_BASE_URL",
  "PATHAO_CLIENT_ID",
  "PATHAO_CLIENT_SECRET",
  "PATHAO_USERNAME",
  "PATHAO_PASSWORD",
  "PATHAO_STORE_ID",
  "PATHAO_BASE_URL",
  "REDX_API_KEY",
  "REDX_BASE_URL"
];
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("codAmountFor", () => {
  it("collects the total on an unpaid order", () => {
    expect(codAmountFor({ id: "x", total: 1360, paymentStatus: "UNPAID" })).toBe(1360);
  });

  it("collects NOTHING on an order already paid", () => {
    // The single most dangerous field: booking a prepaid order with a COD
    // amount makes the rider charge the customer a second time.
    expect(codAmountFor({ id: "x", total: 1360, paymentStatus: "PAID" })).toBe(0);
    expect(codAmountFor({ id: "x", total: 1360, paymentStatus: "REFUNDED" })).toBe(0);
  });

  it("never returns a negative or fractional amount", () => {
    expect(codAmountFor({ id: "x", total: -50, paymentStatus: "UNPAID" })).toBe(0);
    expect(codAmountFor({ id: "x", total: 99.6, paymentStatus: "UNPAID" })).toBe(100);
    expect(codAmountFor({ id: "x", total: null, paymentStatus: "UNPAID" })).toBe(0);
  });
});

describe("localPhone", () => {
  it("converts the stored +880 form to the local 11-digit form couriers expect", () => {
    expect(localPhone("+8801676286325")).toBe("01676286325");
    expect(localPhone("8801676286325")).toBe("01676286325");
    expect(localPhone("01676286325")).toBe("01676286325");
    expect(localPhone("1676286325")).toBe("01676286325");
  });

  it("strips punctuation and survives empty input", () => {
    expect(localPhone("+880 16-7628 6325")).toBe("01676286325");
    expect(localPhone(null)).toBe("");
  });
});

describe("parcelWeightKg", () => {
  it("never returns zero, which couriers reject", () => {
    expect(parcelWeightKg({ id: "x" })).toBeGreaterThan(0);
    expect(parcelWeightKg({ id: "x", items: [] })).toBeGreaterThan(0);
  });

  it("scales with quantity", () => {
    expect(parcelWeightKg({ id: "x", items: [{ quantity: 4 }] })).toBe(2);
  });
});

describe("fullAddress", () => {
  it("joins the parts a rider needs and skips blanks", () => {
    expect(fullAddress({ id: "x", address: "House 12", deliveryArea: "Dhanmondi", city: "Dhaka" })).toBe(
      "House 12, Dhanmondi, Dhaka"
    );
    expect(fullAddress({ id: "x", address: "House 12", city: "Dhaka" })).toBe("House 12, Dhaka");
    expect(fullAddress({ id: "x" })).toBe("");
  });
});

describe("configuredCouriers", () => {
  it("reports none when nothing is set", () => {
    expect(configuredCouriers()).toEqual([]);
  });

  it("only lists a courier once ALL of its credentials are present", () => {
    process.env.STEADFAST_API_KEY = "k";
    process.env.STEADFAST_BASE_URL = "https://x";
    // Secret key still missing — a half-configured courier must not appear
    // usable, which is exactly the state that used to fail at the counter.
    expect(configuredCouriers()).toEqual([]);
    process.env.STEADFAST_SECRET_KEY = "s";
    expect(configuredCouriers()).toEqual(["Steadfast"]);
  });

  it("requires all six Pathao credentials", () => {
    process.env.PATHAO_CLIENT_ID = "a";
    process.env.PATHAO_CLIENT_SECRET = "b";
    process.env.PATHAO_BASE_URL = "https://x";
    expect(configuredCouriers()).toEqual([]);
    process.env.PATHAO_USERNAME = "u";
    process.env.PATHAO_PASSWORD = "p";
    process.env.PATHAO_STORE_ID = "1";
    expect(configuredCouriers()).toEqual(["Pathao"]);
  });
});
