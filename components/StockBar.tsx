type Props = {
  /** Real remaining units. Anything not a positive number hides the bar. */
  stock: number | null | undefined;
  /** Stock level treated as "full" for the fill. */
  baseline: number;
  lang: "en" | "bn";
};

const bn = (n: number) => n.toLocaleString("bn-BD");

// Stock indicator.
//
// The number shown is the real remaining stock, never a decorative countdown.
// Fake scarcity is trivially caught by any buyer who reloads, and on a COD store
// the cost of being caught is a refused delivery, not just a lost sale.
//
// Because it is real, it also self-limits: with plenty of stock the bar simply
// reads as healthy availability rather than pressure, which is the honest
// version of the same nudge.
export default function StockBar({ stock, baseline, lang }: Props) {
  if (typeof stock !== "number" || !Number.isFinite(stock) || stock <= 0) return null;

  const max = Math.max(1, baseline || 50);
  const pct = Math.max(6, Math.min(100, Math.round((stock / max) * 100)));
  // Below a fifth of baseline the bar warms to amber. Colour is the only thing
  // that escalates — the wording stays factual at every level.
  const low = stock <= Math.max(1, Math.round(max * 0.2));

  const label =
    lang === "bn"
      ? `এখন স্টকে আছে ${bn(stock)} টি`
      : `${stock} ${stock === 1 ? "item" : "items"} currently in stock`;

  return (
    <div className="stockbar" role="status">
      <div className="stockbar-head">
        <span className={`stockbar-dot ${low ? "is-low" : ""}`} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="stockbar-track">
        <span
          className={`stockbar-fill ${low ? "is-low" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
