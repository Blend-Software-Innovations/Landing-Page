import { describe, expect, it } from "vitest";
import { escapeHtml, formatOrderMessage, type OrderAlert } from "../lib/telegram";

const order = (over: Partial<OrderAlert> = {}): OrderAlert => ({
  id: "cm5abc123",
  customerName: "Rahim Uddin",
  phone: "01676286325",
  address: "House 12, Road 3",
  city: "Dhaka",
  deliveryArea: "Dhanmondi",
  total: 740,
  paymentMethod: "COD",
  paymentStatus: "UNPAID",
  items: [{ quantity: 1, unitPrice: 680, lineTotal: 680 }],
  ...over
});

describe("escapeHtml", () => {
  it("neutralises Telegram's HTML markup characters", () => {
    expect(escapeHtml('<b>x</b> & "q" \'s\'')).toBe("&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot; &#39;s&#39;");
  });

  it("handles null and undefined without printing them oddly", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("formatOrderMessage", () => {
  it("includes the details needed to fulfil the order", () => {
    const text = formatOrderMessage(order());
    expect(text).toContain("Rahim Uddin");
    expect(text).toContain("01676286325");
    expect(text).toContain("House 12, Road 3");
    expect(text).toContain("Dhanmondi");
    expect(text).toContain("৳740");
    expect(text).toContain("cm5abc123");
  });

  it("makes the phone tappable so the merchant can call to confirm", () => {
    expect(formatOrderMessage(order())).toContain('<a href="tel:01676286325">');
  });

  it("marks cash on delivery distinctly from a paid order", () => {
    expect(formatOrderMessage(order())).toContain("ক্যাশ অন ডেলিভারি");
    expect(formatOrderMessage(order({ paymentMethod: "BKASH" }))).not.toContain("ক্যাশ অন ডেলিভারি");
  });

  it("escapes a hostile customer name instead of emitting raw markup", () => {
    // A customer name is free text posted to a public endpoint; unescaped it
    // would break the message or inject formatting into the merchant's alerts.
    const text = formatOrderMessage(order({ customerName: '<a href="http://evil">Click</a>' }));
    expect(text).not.toContain('<a href="http://evil">');
    expect(text).toContain("&lt;a href=&quot;http://evil&quot;&gt;");
  });

  it("escapes a hostile address too", () => {
    const text = formatOrderMessage(order({ address: "</b><b>spoof" }));
    expect(text).toContain("&lt;/b&gt;&lt;b&gt;spoof");
  });

  it("itemises every line", () => {
    const text = formatOrderMessage(
      order({
        items: [
          { quantity: 2, unitPrice: 680, lineTotal: 1360 },
          { quantity: 1, unitPrice: 100, lineTotal: 100 }
        ],
        total: 1520
      })
    );
    expect(text).toContain("2 × ৳680 = ৳1,360");
    expect(text).toContain("1 × ৳100 = ৳100");
  });

  it("derives a missing line total rather than printing ৳0", () => {
    expect(formatOrderMessage(order({ items: [{ quantity: 3, unitPrice: 200 }] }))).toContain("3 × ৳200 = ৳600");
  });

  it("surfaces a fraud signal when the order carries one", () => {
    const text = formatOrderMessage(order({ fraudScore: 40, fraudFlags: ["txn_duplicate"] }));
    expect(text).toContain("ঝুঁকি 40");
    expect(text).toContain("txn_duplicate");
  });

  it("stays quiet about fraud on a clean order", () => {
    expect(formatOrderMessage(order({ fraudScore: 0, fraudFlags: [] }))).not.toContain("ঝুঁকি");
  });

  it("does not break on an order missing most optional fields", () => {
    const text = formatOrderMessage({ id: "x1", total: 0 });
    expect(text).toContain("x1");
    expect(text).toContain("৳0");
  });
});
