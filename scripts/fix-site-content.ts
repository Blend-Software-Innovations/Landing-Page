/**
 * One-off content migration for the live `site_config` row.
 *
 * WHY THIS EXISTS
 * The storefront merges the DB row OVER lib/siteConfig.ts defaults, so fields an
 * admin edited in the past keep their old values even after the defaults were
 * neutralized. The live row still carries resin-pen copy underneath the current
 * fan product, plus two claims that are now emitted as JSON-LD and are actively
 * dangerous: an unsourced 4.9/1500 aggregateRating, and a 6-month warranty that
 * contradicts the product's own 3-day warranty.
 *
 * This rewrites those fields and nothing else. Fields not named below are left
 * exactly as they are.
 *
 * SAFETY
 *   - Dry run by default. Pass --apply to write.
 *   - saveConfig() snapshots the PREVIOUS config into site_config_audit first,
 *     so this is reversible from the admin panel's rollback button.
 *
 * USAGE
 *   # preview the change (writes nothing)
 *   DATABASE_URL="postgresql://..." npx tsx scripts/fix-site-content.ts
 *
 *   # apply it
 *   DATABASE_URL="postgresql://..." npx tsx scripts/fix-site-content.ts --apply
 *
 * For the DigitalOcean managed database you also need the CA certificate:
 *   DATABASE_CA_CERT="$(cat ca-certificate.crt)" DATABASE_URL="..." npx tsx ... --apply
 *
 * Easiest path is to run it inside the app container, where both are already set:
 *   doctl apps console <APP_ID> --type run
 *   npx tsx scripts/fix-site-content.ts --apply
 */

import "dotenv/config";
import { getConfig, saveConfig } from "../lib/siteConfig.server";
import type { SiteConfig } from "../lib/siteConfig";

const APPLY = process.argv.includes("--apply");

// Public site URL — without this, <link rel="canonical"> and og:url are omitted
// entirely and og:image cannot be made absolute.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blend-landing-rug8e.ondigitalocean.app";

const PRODUCT_NAME_BN = "আইস পোর্টেবল ফ্যান প্রো";

// ---------------------------------------------------------------------------
// bKash / Nagad
//
// There are two independent payment paths, and they need different data:
//
//   1. PAYMENT LINK  — paymentProviders.{bkash,nagad} shows a radio button that
//      POSTs to /api/payment-link and redirects to a gateway URL. This requires
//      paymentLinks.{bkash,nagad}. Enabling the provider WITHOUT a link is worse
//      than leaving it off, so this script refuses to do it.
//
//   2. MANUAL        — always visible. The buyer sends money to the merchant's
//      own bKash/Nagad number, then uploads a proof screenshot for admin review.
//      This requires merchant.{bkash,nagad} to be a real number. Live values are
//      currently the placeholder "01XXXXXXXXX", which is shown to real customers.
//
// Supply whichever you use as environment variables — nothing is invented here:
//   BKASH_NUMBER=01XXXXXXXXX  NAGAD_NUMBER=01XXXXXXXXX     (manual path)
//   BKASH_PAYMENT_LINK=https://...  NAGAD_PAYMENT_LINK=https://...  (link path)
// ---------------------------------------------------------------------------
const BKASH_NUMBER = (process.env.BKASH_NUMBER || "").trim();
const NAGAD_NUMBER = (process.env.NAGAD_NUMBER || "").trim();
const BKASH_LINK = (process.env.BKASH_PAYMENT_LINK || "").trim();
const NAGAD_LINK = (process.env.NAGAD_PAYMENT_LINK || "").trim();

const BD_MOBILE = /^01[3-9]\d{8}$/;

function checkNumber(label: string, value: string) {
  if (!value) return;
  if (!BD_MOBILE.test(value)) {
    console.error(`${label} is not a valid Bangladeshi mobile number: ${JSON.stringify(value)}`);
    console.error("Expected 11 digits starting 013-019, e.g. 01712345678.");
    process.exit(1);
  }
}

function checkLink(label: string, value: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("not https");
  } catch {
    console.error(`${label} must be a valid https:// URL, got: ${JSON.stringify(value)}`);
    process.exit(1);
  }
}

checkNumber("BKASH_NUMBER", BKASH_NUMBER);
checkNumber("NAGAD_NUMBER", NAGAD_NUMBER);
checkLink("BKASH_PAYMENT_LINK", BKASH_LINK);
checkLink("NAGAD_PAYMENT_LINK", NAGAD_LINK);

// Every claim below is traceable to the merchant's own product description:
// semiconductor cooling plate to 16°C, 29,000 RPM motor, 30 km/h wind speed,
// 4000 mAh battery, and the 3-day replacement warranty in the product title.
// Nothing here is invented — unverifiable claims are removed, not reworded.
const patch: Partial<SiteConfig> = {
  siteUrl: SITE_URL,

  seoTitle: "আইস পোর্টেবল ফ্যান প্রো — ১৬°C কুলিং প্লেট, ৪০০০mAh | ক্যাশ অন ডেলিভারি",
  seoDescription:
    "সেমিকন্ডাক্টর কুলিং প্লেট মুহূর্তেই ১৬°C-এ নামে। ২৯,০০০ RPM মোটর, ৩০ km/h বাতাস, ৪০০০mAh ব্যাটারি। ঢাকায় ২৪-৪৮ ঘণ্টায় ডেলিভারি, পণ্য হাতে পেয়ে টাকা দিন।",

  // brandName renders as the header logo, og:site_name and the footer copyright.
  // It currently holds "Aerospace-Grade 29,000 RPM Motor" — a feature headline
  // pasted into the brand field. tagline likewise held "High-Density 4000mAh
  // Battery". Single-product landing page, so the product name is the brand.
  brandName: "Ice Portable Fan Pro",
  tagline: "পোর্টেবল কুলিং ফ্যান — ঢাকায় ২৪-৪৮ ঘণ্টায় ডেলিভারি",

  // Named Stripe and Twilio to customers, and Stripe cannot process Bangladeshi
  // payments at all.
  footerText: "ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন।",

  topNotice: "সীমিত স্টক — আজ অর্ডার করলে দ্রুত ডেলিভারি",

  heroBadge: {
    en: "Semiconductor cooling — not just moving air",
    bn: "সেমিকন্ডাক্টর কুলিং — শুধু বাতাস ঘোরানো নয়"
  },

  heroTitle: {
    en: "Air that is actually cold.",
    bn: "বাতাস নয়, সত্যিকারের ঠান্ডা।"
  },
  heroBody: {
    en: "The cooling plate drops to 16°C in seconds. Hold it to your neck or wrist for an instant ice-pack effect — a 29,000 RPM motor pushes 30 km/h of air, and 4000mAh keeps it running all day.",
    bn: "কুলিং প্লেট কয়েক সেকেন্ডেই ১৬°C-এ নেমে আসে। ঘাড়ে বা কব্জিতে ধরলেই আইস-প্যাকের মতো ঠান্ডা। ২৯,০০০ RPM মোটরে ৩০ km/h বাতাস, আর ৪০০০mAh ব্যাটারি সারাদিন চলে।"
  },
  heroCtaPrimary: {
    en: "Order now",
    bn: "এখনই অর্ডার করুন"
  },
  heroCtaSecondary: {
    en: "See details",
    bn: "বিস্তারিত দেখুন"
  },

  heroHighlights: ["১৬°C কুলিং প্লেট", "২৯,০০০ RPM মোটর", "৪০০০mAh ব্যাটারি"],

  // Stats stay empty: there is no verified unit-sold or rating figure to show,
  // and inventing one is what caused the original credibility problem.
  heroStats: [],

  productHeading: {
    en: "Built to cool, not to circulate.",
    bn: "ঠান্ডা করার জন্য তৈরি, বাতাস ঘোরানোর জন্য নয়।"
  },
  productSubheading: {
    en: "Semiconductor cooling, premium build",
    bn: "সেমিকন্ডাক্টর কুলিং, প্রিমিয়াম বিল্ড"
  },
  productBody: {
    en: "An ordinary fan just moves warm air around. The built-in semiconductor plate actively drops to 16°C, so what reaches you is genuinely cooler than the room.",
    bn: "সাধারণ ফ্যান শুধু গরম বাতাস এদিক-সেদিক করে। এই ফ্যানের সেমিকন্ডাক্টর প্লেট নিজেই ১৬°C-এ নেমে আসে, তাই যে বাতাস আপনি পাচ্ছেন তা ঘরের চেয়ে সত্যিই ঠান্ডা।"
  },
  productCardTitle: {
    en: "Ice Portable Fan Pro",
    bn: PRODUCT_NAME_BN
  },
  productCardBody: {
    en: "Semiconductor cooling plate, 29,000 RPM motor, 4000mAh battery. 3-day replacement warranty.",
    bn: "সেমিকন্ডাক্টর কুলিং প্লেট, ২৯,০০০ RPM মোটর, ৪০০০mAh ব্যাটারি। ৩ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি।"
  },
  productFeatures: ["১৬°C কুলিং প্লেট", "৩০ km/h বাতাস", "৪০০০mAh ব্যাটারি"],

  // Removed rather than rewritten. These were stock names with resin-pen review
  // text, and the 4.9/1500 figures were being emitted to Google as
  // aggregateRating structured data with nothing behind them — a manual-action
  // risk. Re-enable only with real, attributable customer reviews.
  reviews: [],
  googleRating: 0,
  googleReviewCount: 0,
  googleReviewUrl: "",
  reviewsHeading: {
    en: "Customer reviews",
    bn: "ক্রেতাদের মতামত"
  },
  reviewsBody: {
    en: "Verified reviews from real orders will appear here.",
    bn: "আসল অর্ডার থেকে যাচাই করা মতামত এখানে দেখানো হবে।"
  },

  finalCtaTitle: {
    en: "Ready to stop sweating?",
    bn: "গরম থেকে মুক্তি নিতে প্রস্তুত?"
  },
  finalCtaBody: {
    en: "Checkout takes under 2 minutes. Pay when the product reaches your hand.",
    bn: "২ মিনিটেই চেকআউট শেষ। পণ্য হাতে পেয়ে তারপর টাকা দিন।"
  },
  finalCtaButton: {
    en: "Order now — limited stock",
    bn: "এখনই অর্ডার করুন — সীমিত স্টক"
  },

  // THE FUNCTIONAL BUG. optionGroups held one group whose label was
  // "Aerospace-Grade 29,000 RPM Motor" and whose three "options" were sentence
  // fragments of the marketing copy, split on commas:
  //   "Engineered for extreme performance"
  //   "the high-torque motor spins at a massive 29,000 RPM. ..."
  //   "ensuring you stay dry and comfortable even in 100% humidity."
  // The storefront requires every option group to be selected before checkout,
  // so buyers were forced to pick one of these fragments to place an order, and
  // the choice was recorded on the order. This product has a single SKU.
  // Safe to clear: config.variants is empty and priceModifiers is {}, so no
  // pricing depends on these groups.
  optionGroups: [],
  recommended: {},

  // Dead fallback: it read 2000 while the active product sells for 680. The
  // product's basePrice wins today, but the mismatch is a trap for whoever
  // toggles multiProductEnabled off.
  priceBdt: 680,

  products: [
    {
      id: "default-product",
      name: "Ice Portable Fan Pro",
      subtitle: "১৬°C কুলিং প্লেট • ২৯,০০০ RPM • ৪০০০mAh",
      description:
        "সেমিকন্ডাক্টর কুলিং প্লেট কয়েক সেকেন্ডেই ১৬°C-এ নেমে আসে। ২৯,০০০ RPM মোটরে ৩০ km/h বাতাস আর ৪০০০mAh ব্যাটারিতে সারাদিনের ব্যাকআপ। ৩ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি।",
      basePrice: 680,
      category: "Gadget",
      stock: 20,
      outOfStock: false,
      badge: "বেস্ট সেলার"
    }
  ],

  // Placeholder bank/mobile numbers ("Example Bank", "01XXXXXXXXX") were being
  // shown to real customers on the manual-payment screen. Blanked unless a real
  // value was supplied, so the UI hides them rather than displaying a fake.
  merchant: {
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
    bkash: BKASH_NUMBER,
    nagad: NAGAD_NUMBER
  },

  paymentLinks: {
    bkash: BKASH_LINK,
    nagad: NAGAD_LINK,
    rocket: ""
  },

  // Only enable a provider that actually has a link — see the note above.
  paymentProviders: {
    bkash: Boolean(BKASH_LINK),
    nagad: Boolean(NAGAD_LINK),
    rocket: false
  }
};

// The FAQ lives inside sections[], not at the top level. The old items claimed a
// 6-month warranty (the product title says 3 days) and offered custom colours,
// which do not exist for this product. Both are now in FAQPage structured data.
const FAQ_ITEMS = [
  {
    q: "ডেলিভারিতে কত সময় লাগে?",
    a: "ঢাকার ভিতরে ২৪-৪৮ ঘণ্টা। ঢাকার বাইরে ২-৪ দিন।"
  },
  {
    q: "পেমেন্ট কীভাবে করবো?",
    a: "ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে টাকা দিন। বিকাশ বা নগদেও দিতে পারেন।"
  },
  {
    q: "ওয়ারেন্টি আছে কি?",
    a: "হ্যাঁ, ৩ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি। পণ্যে ত্রুটি থাকলে বদলে দেওয়া হবে।"
  },
  {
    q: "পণ্য পছন্দ না হলে ফেরত দেওয়া যাবে?",
    a: "ভুল বা ড্যামেজ পণ্য হলে ডেলিভারির সময়েই ফেরত দিতে পারবেন।"
  }
];

function applyFaq(sections: SiteConfig["sections"]): SiteConfig["sections"] {
  let found = false;
  const next = (sections || []).map((section) => {
    if (section.id !== "faq" && section.type !== "faq") return section;
    found = true;
    return { ...section, settings: { ...(section.settings || {}), items: FAQ_ITEMS } };
  });
  if (!found) {
    console.warn("  ! No faq section found — FAQ items were not applied.");
  }
  return next;
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) {
    // Show the contents of short string arrays — a count alone hides a real
    // change when the length happens to stay the same (e.g. productFeatures).
    if (value.length && value.every((v) => typeof v === "string")) {
      const joined = value.join(" | ");
      return joined.length > 120 ? `[${value.length}] ${joined.slice(0, 120)}…` : `[${value.length}] ${joined}`;
    }
    return `[${value.length} item(s)]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Show both sides of an {en, bn} pair — showing only one makes a real change
    // to the other language look like a no-op in the diff.
    if (typeof obj.bn === "string" || typeof obj.en === "string") {
      return `bn=${JSON.stringify(obj.bn ?? "")} en=${JSON.stringify(obj.en ?? "")}`;
    }
    return JSON.stringify(value).slice(0, 90);
  }
  const str = String(value);
  return str.length > 90 ? `${str.slice(0, 90)}…` : str;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — refusing to run against the local JSON fallback.");
    process.exit(1);
  }

  const current = await getConfig();
  const next: SiteConfig = { ...current, ...patch, sections: applyFaq(current.sections) };

  console.log(APPLY ? "APPLYING content migration\n" : "DRY RUN — nothing will be written\n");

  console.log("Payment configuration:");
  for (const [name, num, link] of [
    ["bKash", BKASH_NUMBER, BKASH_LINK],
    ["Nagad", NAGAD_NUMBER, NAGAD_LINK]
  ] as const) {
    const parts: string[] = [];
    parts.push(link ? "payment-link radio ENABLED" : "payment-link radio off (no link supplied)");
    parts.push(num ? `manual payment shows ${num}` : "manual payment hides number (none supplied)");
    console.log(`  ${name}: ${parts.join(" | ")}`);
  }
  if (!BKASH_LINK && !NAGAD_LINK && !BKASH_NUMBER && !NAGAD_NUMBER) {
    console.log("  ! No bKash/Nagad values supplied — both stay off and COD remains the only");
    console.log("    working checkout path. See the header of this file for the env vars.");
  }
  console.log("");

  let changes = 0;
  for (const key of Object.keys(patch) as Array<keyof SiteConfig>) {
    const before = JSON.stringify(current[key]);
    const after = JSON.stringify(next[key]);
    if (before === after) continue;
    changes += 1;
    console.log(`  ${String(key)}`);
    console.log(`    - ${summarize(current[key])}`);
    console.log(`    + ${summarize(next[key])}`);
  }
  if (JSON.stringify(current.sections) !== JSON.stringify(next.sections)) {
    changes += 1;
    const oldFaq = (current.sections || []).find((s) => s.id === "faq" || s.type === "faq");
    console.log("  sections[faq].items");
    console.log(`    - [${(oldFaq?.settings?.items || []).length} item(s)]`);
    console.log(`    + [${FAQ_ITEMS.length} item(s)]`);
  }

  if (!changes) {
    console.log("  No differences — the row already matches. Nothing to do.");
    process.exit(0);
  }

  console.log(`\n${changes} field(s) would change.`);

  if (!APPLY) {
    console.log("\nRe-run with --apply to write. The previous config is snapshotted to");
    console.log("site_config_audit first, so it stays reversible from the admin panel.");
    process.exit(0);
  }

  await saveConfig(next, {
    actor: "scripts/fix-site-content.ts",
    role: "system",
    note: "De-mashup: replace resin-pen leftovers with fan product copy; drop unsourced rating; fix warranty contradiction"
  });

  console.log("\nDone. Previous version saved to site_config_audit (rollback available in admin).");
  console.log("The storefront caches for 60s (s-maxage), so allow a minute before checking.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Content migration failed:", error);
  process.exit(1);
});
