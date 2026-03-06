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
  { id: "section-offer", type: "offer", enabled: true, order: 2, settings: { text: "Limited batch — order today." } },
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
        { q: "How long is delivery?", a: "Dhaka: 24-48 hours. Outside Dhaka: 2-4 days." },
        { q: "Is there a warranty?", a: "Yes, 6-month replacement warranty." },
        { q: "Can I request a custom color?", a: "Yes, choose a custom color during order." }
      ]
    }
  },
  { id: "section-sticky", type: "sticky_buy", enabled: true, order: 10, settings: { text: "Order now — limited stock." } }
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
  seoTitle: "Sahariar's Pen | Handmade Resin Pens",
  seoDescription:
    "Handmade, customizable resin pens crafted in Bangladesh. Unique designs, premium finish, and gift-ready packaging.",
  seoImage: "/gallery/gallery-main.png",
  social: {
    whatsapp: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: ""
  },
  promoEnabled: true,
  promoText: "Limited batch — Order today for fastest delivery.",
  brandName: "Sahariar's Pen",
  tagline: "বাংলাদেশে হাতে বানানো রেজিন পেন।",
  logoUrl: "",
  footerText: "Secure checkout by Stripe. SMS confirmations by Twilio.",
  topNotice: "লিমিটেড ব্যাচ - কাস্টম রেজিন পেন প্রস্তুত",
  heroTitle: {
    en: "A pen as unique as your handwriting.",
    bn: "আপনার লেখার মতোই ইউনিক একটি পেন।"
  },
  heroBody: {
    en:
      "Sahariar's Pen crafts custom resin pens with deep color, smooth balance, and a premium feel. Each piece is handmade and one of a kind.",
    bn:
      "Sahariar's Pen বানায় কাস্টম রেজিন পেন - গভীর রঙ, স্মুথ ব্যালান্স আর প্রিমিয়াম ফিনিশ সহ। প্রতিটি পেন একেবারে ইউনিক।"
  },
  heroCtaPrimary: { en: "Order Your Pen", bn: "আপনার পেন অর্ডার করুন" },
  heroCtaSecondary: { en: "See the craft", bn: "কাজটি দেখুন" },
  finalCtaTitle: { en: "Ready for a pen that feels special?", bn: "একটি স্পেশাল পেন নিতে প্রস্তুত?" },
  finalCtaBody: {
    en: "Complete checkout in under 2 minutes. Instant SMS confirmation included.",
    bn: "২ মিনিটের মধ্যে চেকআউট শেষ করুন। সাথে সাথে SMS কনফার্মেশন পাবেন।"
  },
  finalCtaButton: { en: "Order Now - Limited Stock", bn: "এখনই অর্ডার করুন - সীমিত স্টক" },
  priceBdt: 4999,
  priceModifiers: {
    "option-a": {
      "Standard (140mm)": 0,
      "Slim (135mm)": 100,
      "Long (150mm)": 180
    },
    "option-b": {
      Signature: 0,
      Premium: 200,
      "Gift Edition": 300
    },
    "option-c": {
      Minimal: 0,
      Marble: 150,
      "Gold Flake": 250,
      Glitter: 200
    }
  },
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
  optionGroups: [
    {
      id: "option-a",
      labelEn: "Option A",
      labelBn: "অপশন A",
      options: ["Standard (140mm)", "Slim (135mm)", "Long (150mm)"]
    },
    {
      id: "option-b",
      labelEn: "Option B",
      labelBn: "অপশন B",
      options: ["Signature", "Premium", "Gift Edition"]
    },
    {
      id: "option-c",
      labelEn: "Option C",
      labelBn: "অপশন C",
      options: ["Minimal", "Marble", "Gold Flake", "Glitter"]
    }
  ],
  recommended: {
    "option-a": ["Standard (140mm)"],
    "option-b": ["Premium"],
    "option-c": ["Gold Flake"]
  },
  productFeatures: ["Handmade finish", "Balanced weight", "Gift-ready box"],
  productHeading: {
    en: "Every pen is handcrafted, never mass-produced.",
    bn: "প্রতিটি পেন হাতে তৈরি - কখনও মাস প্রোডাক্ট নয়।"
  },
  productSubheading: { en: "Custom resin, premium feel", bn: "কাস্টম রেজিন, প্রিমিয়াম ফিল" },
  productBody: {
    en:
      "Resin pens are unique by nature. We pour, polish, and finish each pen by hand to create a smooth, balanced writing experience.",
    bn:
      "রেজিন পেন স্বভাবগতভাবে ইউনিক। আমরা হাতে ঢেলে, পলিশ করে প্রতিটি পেন তৈরি করি যাতে লেখা হয় স্মুথ আর ব্যালান্সড।"
  },
  productCardTitle: { en: "Signature Resin Pen", bn: "সিগনেচার রেজিন পেন" },
  productCardBody: {
    en: "Handmade resin body with polished finish and gift box.",
    bn: "হাতে বানানো রেজিন বডি, পলিশ ফিনিশ ও গিফট বক্সসহ।"
  },
  reviewsHeading: {
    en: "Loved by gift buyers and creators",
    bn: "গিফট ও ডেইলি রাইটিংয়ের জন্য সেরা পছন্দ"
  },
  reviewsBody: {
    en: "Real feedback from customers who chose Sahariar's Pen for daily writing and gifting.",
    bn: "যারা Sahariar's Pen বেছে নিয়েছেন, তাদের আসল মতামত।"
  },
  reviews: [
    {
      name: "Jordan Lee",
      role: "Creative Director",
      rating: 5,
      bn: "রেজিন ফিনিশ একদম প্রিমিয়াম, হাতে ধরতেই ভালো লাগে।",
      en: "The resin finish is stunning and feels premium in hand."
    },
    {
      name: "Priya Shah",
      role: "Founder, Bloom Lab",
      rating: 5,
      bn: "গিফট হিসেবে দিয়েছিলাম, সবাই খুব পছন্দ করেছে।",
      en: "Gave it as a gift and they loved the custom look."
    },
    {
      name: "Marco Alvarez",
      role: "Product Designer",
      rating: 4,
      bn: "লিখতে অনেক স্মুথ, আর দেখতে দারুণ।",
      en: "Smooth to write with and looks amazing on my desk."
    }
  ],
  googleReviewUrl: "",
  googleRating: 4.9,
  googleReviewCount: 1500,
  youtubeUrl: "https://www.youtube.com/embed/Ju4f6sc1rUo",
  gallery: [
    { url: "/gallery/gallery-blue-pen.png", caption: "Blue resin pen set" },
    { url: "/gallery/gallery-pink-set.png", caption: "Pink glitter set" },
    { url: "/gallery/gallery-rose-set.png", caption: "Rose resin set" }
  ],
  signatureImage: "/gallery/gallery-main.png",
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
    accountName: "Sahariar's Pen",
    accountNumber: "123-456-789",
    branch: "Dhanmondi Branch",
    bkash: "01XXXXXXXXX",
    nagad: "01XXXXXXXXX"
  },
  experiments: [
    {
      id: "hero-copy-1",
      name: "Hero Copy Test",
      active: false,
      variants: [
        { id: "control", name: "Control", weight: 50, copy: {} },
        {
          id: "warm",
          name: "Warm Tone",
          weight: 50,
          copy: {
            heroTitle: { en: "A handcrafted pen made just for you.", bn: "শুধু আপনার জন্য হাতে বানানো পেন।" },
            heroBody: {
              en: "Every resin pen is poured, polished, and balanced by hand. Gift‑ready and unforgettable.",
              bn: "প্রতিটি রেজিন পেন হাতে ঢালা, পলিশ ও ব্যালান্স করা। গিফট‑রেডি এবং স্মরণীয়।"
            },
            finalCtaTitle: { en: "Ready to make it yours?", bn: "আপনারটা নিতে প্রস্তুত?" },
            finalCtaButton: { en: "Order Now", bn: "এখনই অর্ডার করুন" },
            promoText: "Limited batch — claim your custom pen today."
          }
        }
      ]
    }
  ],
  features: {
    inventoryEnabled: false,
    variantImagesEnabled: false,
    multiProductEnabled: false,
    categoriesEnabled: false,
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
      name: "Signature Resin Pen",
      subtitle: "Handmade",
      description: "Handmade resin pen with polished finish.",
      basePrice: 4999,
      category: "Resin",
      stock: 20,
      outOfStock: false,
      badge: "Best seller"
    }
  ],
  variants: [],
  variantImages: {},
  sections: defaultSections
};
