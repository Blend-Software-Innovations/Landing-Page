export type Review = {
  name: string;
  role: string;
  rating: number;
  bn: string;
  en: string;
};

export type GalleryItem = {
  url: string;
  caption: string;
  /** Optional colour/variant label (e.g. "White", "সাদা"). Images sharing a
   *  label are grouped behind one swatch so a buyer can flip between colours;
   *  untagged images show for every colour. */
  color?: string;
};

export type OptionGroup = {
  id: string;
  labelEn: string;
  labelBn: string;
  options: string[];
};

export type ExperimentVariant = {
  id: string;
  name: string;
  weight: number;
  copy: {
    heroTitle?: { en?: string; bn?: string };
    heroBody?: { en?: string; bn?: string };
    heroCtaPrimary?: { en?: string; bn?: string };
    heroCtaSecondary?: { en?: string; bn?: string };
    finalCtaTitle?: { en?: string; bn?: string };
    finalCtaBody?: { en?: string; bn?: string };
    finalCtaButton?: { en?: string; bn?: string };
    promoText?: string;
    topNotice?: string;
  };
};

export type Experiment = {
  id: string;
  name: string;
  active: boolean;
  variants: ExperimentVariant[];
};

export type SectionType =
  | "hero"
  | "offer"
  | "countdown"
  | "gallery"
  | "features"
  | "reviews"
  | "faq"
  | "video"
  | "order"
  | "sticky_buy";

export type SectionConfig = {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  settings?: Record<string, any>;
};

export type SiteConfig = {
  siteUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoImage: string;
  social: {
    whatsapp: string;
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
  };
  promoEnabled: boolean;
  promoText: string;
  brandName: string;
  tagline: string;
  logoUrl: string;
  footerText: string;
  topNotice: string;
  heroTitle: { en: string; bn: string };
  heroBody: { en: string; bn: string };
  heroBadge?: { en: string; bn: string };
  heroHighlights?: string[];
  heroStats?: Array<{ value: number; suffix: string; labelEn: string; labelBn: string }>;
  giftWrapFee?: number;
  heroCtaPrimary: { en: string; bn: string };
  heroCtaSecondary: { en: string; bn: string };
  finalCtaTitle: { en: string; bn: string };
  finalCtaBody: { en: string; bn: string };
  finalCtaButton: { en: string; bn: string };
  priceBdt: number;
  priceModifiers: Record<string, Record<string, number>>;
  shippingFees: {
    insideDhaka: number;
    outsideDhaka: number;
  };
  shippingRules: {
    enabled: boolean;
    unit: "g";
    tiers: Array<{
      maxWeight: number;
      insideDhaka: number;
      outsideDhaka: number;
    }>;
  };
  freeDeliveryThresholdQty: number;
  deliveryAreas: Array<{ name: string; fee: number; minOrder?: number }>;
  minOrderValue: number;
  deliverySlots: string[];
  optionGroups: OptionGroup[];
  recommended: Record<string, string[]>;
  productFeatures: string[];
  productHeading: { en: string; bn: string };
  productSubheading: { en: string; bn: string };
  productBody: { en: string; bn: string };
  productCardTitle: { en: string; bn: string };
  productCardBody: { en: string; bn: string };
  reviewsHeading: { en: string; bn: string };
  reviewsBody: { en: string; bn: string };
  reviews: Review[];
  googleReviewUrl: string;
  googleRating: number;
  googleReviewCount: number;
  youtubeUrl: string;
  gallery: GalleryItem[];
  signatureImage: string;
  deliveryPartners: string[];
  paymentProviders: {
    bkash: boolean;
    nagad: boolean;
    rocket: boolean;
  };
  paymentLinks: {
    bkash: string;
    nagad: string;
    rocket: string;
  };
  merchant: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    bkash: string;
    nagad: string;
  };
  experiments?: Experiment[];
    features: {
      inventoryEnabled: boolean;
      variantImagesEnabled: boolean;
      multiProductEnabled: boolean;
      categoriesEnabled: boolean;
      otpEnabled: boolean;
    };
    otpSettings: {
      cooldownSec: number;
      lockoutAttempts: number;
      lockoutMin: number;
    };
  activeProductId: string;
  products: Array<{
    id: string;
    name: string;
    subtitle: string;
    description: string;
    basePrice: number;
    category: string;
    stock: number;
    outOfStock: boolean;
    badge: string;
  }>;
  variants: Array<{
    id: string;
    optionValues: Record<string, string>;
    sku: string;
    stockQty: number;
    weight?: number;
    images: string[];
    price: number;
  }>;
  variantImages: Record<string, Record<string, string>>;
  sections: SectionConfig[];
};

export const defaultSections: SectionConfig[] = [
  { id: "section-hero", type: "hero", enabled: true, order: 1 },
  { id: "section-offer", type: "offer", enabled: true, order: 2, settings: { text: "সীমিত স্টক — আজই অর্ডার করুন।" } },
  { id: "section-countdown", type: "countdown", enabled: false, order: 3, settings: { endDate: "" } },
  { id: "section-gallery", type: "gallery", enabled: true, order: 4 },
  { id: "section-features", type: "features", enabled: true, order: 5 },
  { id: "section-reviews", type: "reviews", enabled: true, order: 6 },
  { id: "section-video", type: "video", enabled: true, order: 7 },
  { id: "section-order", type: "order", enabled: true, order: 8 },
  {
    id: "section-faq",
    type: "faq",
    enabled: true,
    order: 9,
    settings: {
      items: [
        { q: "ডেলিভারিতে কত সময় লাগে?", a: "ঢাকার ভিতরে ২৪-৪৮ ঘণ্টা, ঢাকার বাইরে ২-৪ দিন।" },
        { q: "পেমেন্ট কীভাবে করবো?", a: "ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন। চাইলে বিকাশ বা নগদেও আগে পেমেন্ট করতে পারেন।" },
        { q: "পণ্য পছন্দ না হলে কী হবে?", a: "ভুল বা ড্যামেজ পণ্য পেলে ডেলিভারির ৩ দিনের মধ্যে জানালে আমরা বদলে দেবো।" }
      ]
    }
  },
  { id: "section-sticky", type: "sticky_buy", enabled: true, order: 10, settings: { text: "সীমিত স্টক — আজই অর্ডার করুন।" } }
];

export function normalizeSections(sections?: SectionConfig[]) {
  const base = defaultSections;
  if (!sections || !sections.length) return base.map((s) => ({ ...s }));
  const mapped = sections.map((item, index) => ({
    ...item,
    order: Number.isFinite(item.order) ? item.order : index + 1
  }));
  const types = new Set(mapped.map((item) => item.type));
  const merged = [...mapped];
  base.forEach((item) => {
    if (!types.has(item.type)) merged.push({ ...item, order: merged.length + 1 });
  });
  return merged.sort((a, b) => a.order - b.order);
}

export const defaultConfig: SiteConfig = {
  siteUrl: "",
  seoTitle: "Online Store | Quality Products, Fast Delivery",
  seoDescription:
    "Shop quality products online in Bangladesh. Secure checkout, fast delivery, and friendly support.",
  seoImage: "",
  social: {
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: ""
  },
  promoEnabled: true,
  promoText: "সীমিত স্টক — দ্রুত ডেলিভারি পেতে আজই অর্ডার করুন।",
  brandName: "Our Store",
  tagline: "মানসম্পন্ন পণ্য, দ্রুত ডেলিভারি।",
  logoUrl: "",
  // Naming the payment/SMS vendors here leaks stack details to customers and
  // reads as an unfinished template.
  footerText: "নিরাপদ চেকআউট, অর্ডার কনফার্মেশন SMS-এ।",
  topNotice: "লিমিটেড স্টক - আজই অর্ডার করুন",
  heroTitle: {
    en: "Quality products, delivered to your door.",
    bn: "মানসম্পন্ন পণ্য, পৌঁছে যাবে আপনার দরজায়।"
  },
  heroBody: {
    en:
      "We source quality products and deliver them across Bangladesh with secure checkout and instant confirmation.",
    bn:
      "আমরা মানসম্পন্ন পণ্য সংগ্রহ করে সারা বাংলাদেশে পৌঁছে দিই - সিকিউর চেকআউট আর সাথে সাথে কনফার্মেশন সহ।"
  },
  heroBadge: { en: "", bn: "" },
  heroHighlights: [],
  heroStats: [],
  giftWrapFee: 120,
  heroCtaPrimary: { en: "Order Now", bn: "এখনই অর্ডার করুন" },
  heroCtaSecondary: { en: "See the product", bn: "পণ্যটি দেখুন" },
  finalCtaTitle: { en: "Ready to place your order?", bn: "অর্ডার করতে প্রস্তুত?" },
  finalCtaBody: {
    en: "Complete checkout in under 2 minutes. Instant SMS confirmation included.",
    bn: "২ মিনিটের মধ্যে চেকআউট শেষ করুন। সাথে সাথে SMS কনফার্মেশন পাবেন।"
  },
  finalCtaButton: { en: "Order Now - Limited Stock", bn: "এখনই অর্ডার করুন - সীমিত স্টক" },
  priceBdt: 1000,
  // No option groups by default: a fresh store sells one simple product. The
  // previous defaults described a specific product's variants, which then showed
  // up underneath every other product the admin configured.
  priceModifiers: {},
  shippingFees: {
    insideDhaka: 0,
    outsideDhaka: 120
  },
  shippingRules: {
    enabled: false,
    unit: "g",
    tiers: [
      { maxWeight: 250, insideDhaka: 80, outsideDhaka: 130 },
      { maxWeight: 500, insideDhaka: 120, outsideDhaka: 180 },
      { maxWeight: 1000, insideDhaka: 160, outsideDhaka: 220 }
    ]
  },
  freeDeliveryThresholdQty: 2,
  deliveryAreas: [
    { name: "Dhanmondi", fee: 60, minOrder: 300 },
    { name: "Mirpur", fee: 80, minOrder: 300 },
    { name: "Uttara", fee: 100, minOrder: 500 }
  ],
  minOrderValue: 0,
  deliverySlots: ["9 AM – 12 PM", "12 PM – 3 PM", "3 PM – 6 PM", "6 PM – 9 PM"],
  optionGroups: [],
  recommended: {},
  productFeatures: ["যাচাই করা মান", "দ্রুত ডেলিভারি", "সহজ রিটার্ন"],
  productHeading: {
    en: "Made for everyday use, built to last.",
    bn: "প্রতিদিনের ব্যবহারের জন্য, টেকসই মানের।"
  },
  productSubheading: { en: "Quality you can trust", bn: "বিশ্বাসযোগ্য মান" },
  productBody: {
    en:
      "We check every item before dispatch so you receive exactly what you ordered, in perfect condition.",
    bn:
      "ডিসপ্যাচের আগে প্রতিটি পণ্য যাচাই করা হয়, যাতে আপনি নিখুঁত অবস্থায় সঠিক পণ্যটি পান।"
  },
  productCardTitle: { en: "Featured Product", bn: "ফিচার্ড প্রোডাক্ট" },
  productCardBody: {
    en: "Quality product with careful packaging and fast delivery.",
    bn: "মানসম্পন্ন পণ্য, যত্নসহ প্যাকেজিং ও দ্রুত ডেলিভারি।"
  },
  reviewsHeading: {
    en: "What customers say",
    bn: "কাস্টমাররা যা বলছেন"
  },
  reviewsBody: {
    en: "Real feedback from customers who ordered from our store.",
    bn: "আমাদের স্টোর থেকে যারা অর্ডার করেছেন, তাদের আসল মতামত।"
  },
  reviews: [],
  googleReviewUrl: "",
  googleRating: 0,
  googleReviewCount: 0,
  youtubeUrl: "",
  // Empty by default — the bundled placeholder files are 68-byte stubs, and a
  // broken <img> costs more trust than an absent gallery. The admin uploads real
  // photos; the gallery and product-image slots stay hidden until then.
  gallery: [],
  signatureImage: "",
  deliveryPartners: ["Pathao", "Steadfast"],
  paymentProviders: {
    bkash: false,
    nagad: false,
    rocket: false
  },
  paymentLinks: {
    bkash: "",
    nagad: "",
    rocket: ""
  },
  merchant: {
    bankName: "Example Bank",
    accountName: "Your Business",
    accountNumber: "123-456-789",
    branch: "Dhanmondi Branch",
    bkash: "01XXXXXXXXX",
    nagad: "01XXXXXXXXX"
  },
  experiments: [],
  features: {
    inventoryEnabled: true,
    variantImagesEnabled: false,
    multiProductEnabled: true,
    categoriesEnabled: true,
    otpEnabled: false
  },
  otpSettings: {
    cooldownSec: 60,
    lockoutAttempts: 5,
    lockoutMin: 10
  },
  activeProductId: "default-product",
  products: [
    {
      id: "default-product",
      name: "Featured Product",
      subtitle: "Best seller",
      description: "Quality product with careful packaging.",
      basePrice: 1000,
      category: "General",
      stock: 20,
      outOfStock: false,
      badge: "Best seller"
    }
  ],
  variants: [],
  variantImages: {},
  sections: defaultSections
};
