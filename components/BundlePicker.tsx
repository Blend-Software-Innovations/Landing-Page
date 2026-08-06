import type { BundleTier } from "../lib/siteConfig";

type Props = {
  tiers: BundleTier[];
  unitPrice: number;
  quantity: number;
  onSelect: (quantity: number) => void;
  lang: "en" | "bn";
  freeDeliveryLabel: string;
};

const bdt = (n: number) => `৳${Math.round(n).toLocaleString("en-BD")}`;

// Quantity-tier offer ("Buy 2, save 10%").
//
// The whole point is to make the SECOND unit feel like the obvious choice, so
// each row states the per-unit price rather than only the total — "৳612 each"
// is what makes the saving legible, where a lump total just looks like a bigger
// number. The discount itself is resolved server-side from the quantity, so
// nothing here can be used to claim a tier that wasn't bought.
export default function BundlePicker({ tiers, unitPrice, quantity, onSelect, lang, freeDeliveryLabel }: Props) {
  const sorted = [...(tiers || [])]
    .filter((t) => t.quantity > 0)
    .sort((a, b) => a.quantity - b.quantity);
  if (!sorted.length) return null;

  // The single unit is always the first option, so the ladder starts from what
  // the buyer already has in mind.
  const options = [{ quantity: 1, discountPercent: 0 } as BundleTier, ...sorted];

  const heading = lang === "bn" ? "একসাথে নিন, সাশ্রয় করুন" : "Bundle & save";
  const eachLabel = (n: number) => (lang === "bn" ? `৳${n.toLocaleString("en-BD")} / পিস` : `৳${n} each`);
  const saveLabel = (p: number) => (lang === "bn" ? `${p}% সাশ্রয়` : `Save ${p}%`);
  const singleLabel = lang === "bn" ? "একটি" : "Single";
  const buyLabel = (n: number) => (lang === "bn" ? `${n} টি নিন` : `Buy ${n}`);

  // Highest tier reached by the current quantity — mirrors resolveBundleTier so
  // the highlighted row always matches what is actually being charged.
  const activeQty = options.reduce((acc, o) => (quantity >= o.quantity ? o.quantity : acc), 1);

  return (
    <div className="bundle">
      <div className="bundle-heading">
        <span>{heading}</span>
      </div>
      <div className="bundle-list">
        {options.map((tier) => {
          const gross = unitPrice * tier.quantity;
          const net = Math.round(gross * (1 - (tier.discountPercent || 0) / 100));
          const perUnit = Math.round(net / tier.quantity);
          const isActive = activeQty === tier.quantity;
          return (
            <button
              key={tier.quantity}
              type="button"
              onClick={() => onSelect(tier.quantity)}
              aria-pressed={isActive}
              className={`bundle-row ${isActive ? "is-active" : ""}`}
            >
              {tier.badge ? <span className="bundle-badge">{tier.badge}</span> : null}
              <span className="bundle-radio" aria-hidden="true" />
              <span className="bundle-main">
                <span className="bundle-title">
                  {tier.quantity === 1 ? singleLabel : buyLabel(tier.quantity)}
                  {tier.discountPercent ? <span className="bundle-save">{saveLabel(tier.discountPercent)}</span> : null}
                </span>
                {tier.quantity > 1 ? <span className="bundle-each">{eachLabel(perUnit)}</span> : null}
              </span>
              <span className="bundle-price">
                {tier.discountPercent ? <s className="bundle-was">{bdt(gross)}</s> : null}
                <span className="bundle-now">{bdt(net)}</span>
              </span>
              {tier.freeDelivery ? <span className="bundle-free">{freeDeliveryLabel}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
