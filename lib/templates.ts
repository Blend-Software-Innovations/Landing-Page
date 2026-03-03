import { SiteConfig, defaultConfig } from "./siteConfig";

export type Template = {
  id: string;
  name: string;
  description: string;
  config: Partial<SiteConfig>;
};

const base = defaultConfig;

export const templates: Template[] = [
  {
    id: "cosmetics",
    name: "Cosmetics / Skincare",
    description: "Glow-focused hero, beauty reviews, soft colors.",
    config: {
      brandName: "Glow Theory",
      tagline: "Glow-forward skincare made in Bangladesh.",
      promoText: "Limited launch — free delivery on 2+ items.",
      heroTitle: { en: "Glow-first skincare that feels premium.", bn: "গ্লো-ফার্স্ট স্কিনকেয়ার, প্রিমিয়াম ফিল।" },
      heroBody: { en: "Clinically inspired formulas with lightweight texture and visible results.", bn: "হালকা টেক্সচার, ফলাফল পাওয়া যায় এমন ফর্মুলা।" },
      productHeading: { en: "Dermatologist-inspired, everyday gentle care.", bn: "ডার্মাটোলজিস্ট ইনস্পায়ার্ড, ডেইলি কেয়ার।" },
      productSubheading: { en: "Skin-safe formulas", bn: "স্কিন-সেইফ ফর্মুলা" },
      productCardTitle: { en: "Radiance Serum", bn: "রেডিয়েন্স সিরাম" },
      productCardBody: { en: "Hydrating glow serum with vitamin-rich blend.", bn: "ভিটামিন সমৃদ্ধ গ্লো সিরাম।" },
      priceBdt: 1299,
      optionGroups: [
        { id: "option-a", labelEn: "Size", labelBn: "সাইজ", options: ["30ml", "50ml", "100ml"] },
        { id: "option-b", labelEn: "Routine", labelBn: "রুটিন", options: ["Daily", "Night", "Sensitive"] }
      ]
    }
  },
  {
    id: "electronics",
    name: "Electronics / Gadgets",
    description: "Specs-driven layout with warranty emphasis.",
    config: {
      brandName: "Voltix",
      tagline: "Smart gadgets with reliable performance.",
      promoText: "Flash deal — limited stock in Dhaka.",
      heroTitle: { en: "Wireless tech that keeps up with you.", bn: "ওয়্যারলেস টেক যা আপনার সঙ্গে তাল মেলায়।" },
      heroBody: { en: "Long battery, clear sound, and instant pairing.", bn: "দীর্ঘ ব্যাটারি, ক্লিয়ার সাউন্ড, ইনস্ট্যান্ট পেয়ারিং।" },
      productCardTitle: { en: "Pro Earbuds", bn: "প্রো ইয়ারবাডস" },
      productCardBody: { en: "Noise isolation, 24h battery, compact case.", bn: "নয়েজ আইসোলেশন, ২৪ ঘন্টা ব্যাটারি।" },
      priceBdt: 2599,
      optionGroups: [
        { id: "option-a", labelEn: "Color", labelBn: "কালার", options: ["Black", "Silver", "Mint"] },
        { id: "option-b", labelEn: "Warranty", labelBn: "ওয়ারেন্টি", options: ["6 months", "12 months"] }
      ]
    }
  },
  {
    id: "clothing",
    name: "Clothing / Fashion",
    description: "Size + color options with style focus.",
    config: {
      brandName: "Urban Loom",
      tagline: "Modern fits, crafted in Bangladesh.",
      promoText: "Buy 2 get free delivery.",
      heroTitle: { en: "Everyday style that fits just right.", bn: "প্রতিদিনের স্টাইল, নিখুঁত ফিট।" },
      heroBody: { en: "Soft fabrics, flattering cuts, and clean finishing.", bn: "সফট ফ্যাব্রিক, সুন্দর কাটিং, ক্লিন ফিনিশ।" },
      productCardTitle: { en: "Premium Cotton Shirt", bn: "প্রিমিয়াম কটন শার্ট" },
      productCardBody: { en: "Breathable cotton with durable stitching.", bn: "আরামদায়ক কটন, টেকসই স্টিচিং।" },
      priceBdt: 1799,
      optionGroups: [
        { id: "option-a", labelEn: "Size", labelBn: "সাইজ", options: ["S", "M", "L", "XL"] },
        { id: "option-b", labelEn: "Color", labelBn: "কালার", options: ["Black", "White", "Olive"] },
        { id: "option-c", labelEn: "Fit", labelBn: "ফিট", options: ["Regular", "Slim", "Relaxed"] }
      ]
    }
  },
  {
    id: "food",
    name: "Food / Grocery",
    description: "Trust, purity, and freshness highlight.",
    config: {
      brandName: "PureHarvest",
      tagline: "Trusted food essentials delivered fast.",
      promoText: "Fresh batch — order before 10 PM.",
      heroTitle: { en: "Pure taste, healthy nutrition.", bn: "বিশুদ্ধ স্বাদ, স্বাস্থ্যকর পুষ্টি।" },
      heroBody: { en: "Sourced from trusted farms and packed fresh.", bn: "বিশ্বস্ত উৎস থেকে সংগ্রহ করা ফ্রেশ প্যাক।" },
      productCardTitle: { en: "Organic Honey", bn: "অর্গানিক মধু" },
      productCardBody: { en: "Raw honey with authentic taste.", bn: "অথেন্টিক স্বাদসহ কাঁচা মধু।" },
      priceBdt: 899,
      optionGroups: [
        { id: "option-a", labelEn: "Pack size", labelBn: "প্যাক সাইজ", options: ["250g", "500g", "1kg"] }
      ]
    }
  }
];

export function applyTemplate(baseConfig: SiteConfig, templateId: string): SiteConfig {
  const template = templates.find((item) => item.id === templateId);
  if (!template) return baseConfig;
  return {
    ...baseConfig,
    ...template.config,
    heroTitle: { ...baseConfig.heroTitle, ...(template.config.heroTitle || {}) },
    heroBody: { ...baseConfig.heroBody, ...(template.config.heroBody || {}) },
    productHeading: { ...baseConfig.productHeading, ...(template.config.productHeading || {}) },
    productSubheading: { ...baseConfig.productSubheading, ...(template.config.productSubheading || {}) },
    productCardTitle: { ...baseConfig.productCardTitle, ...(template.config.productCardTitle || {}) },
    productCardBody: { ...baseConfig.productCardBody, ...(template.config.productCardBody || {}) }
  };
}
