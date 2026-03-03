
import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import Layout from "../components/Layout";
import Product from "../components/Product";
import Reviews from "../components/Reviews";
import Video from "../components/Video";
import { SiteConfig, Experiment, ExperimentVariant, Review } from "../lib/siteConfig";
import { getConfig } from "../lib/siteConfig.server";

type Lang = "en" | "bn";

type UiCopy = {
  navProduct: string;
  navReviews: string;
  navDemo: string;
  navCheckout: string;
  heroBadge: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroHighlights: string[];
  heroStats: Array<{ label: string; to: number; suffix: string }>;
  orderTitleBn: string;
  orderTitleEn: string;
  orderBody: string;
  formCta: string;
  formCtaLoading: string;
  formConsent: string;
  requiredFieldsError: string;
  addressFieldsError: string;
  invalidPhoneError: string;
  optionsRequiredError: string;
  codSuccess: string;
  codFailure: string;
  manualProofError: string;
  manualTxnError: string;
  manualSuccess: string;
  codCta: string;
  manualCta: string;
  paymentStripe: string;
  paymentManual: string;
  manualNote: string;
  txnLabel: string;
  proofLabel: string;
  deliveryInside: string;
  deliveryOutside: string;
  selectProduct: string;
  productHint: string;
  formName: string;
  formEmail: string;
  formPhone: string;
  formAddress: string;
  formCity: string;
  formArea: string;
  codLabel: string;
  codNote: string;
  orderSummary: string;
  summarySubtotal: string;
  summaryGiftWrap: string;
  summaryShipping: string;
  summaryTotal: string;
};

const ui: Record<Lang, UiCopy> = {
  en: {
    navProduct: "Product",
    navReviews: "Reviews",
    navDemo: "Demo",
    navCheckout: "Order",
    heroBadge: "Sahariar's Pen - Handmade Resin",
    heroCtaPrimary: "Order Your Pen",
    heroCtaSecondary: "See the craft",
    heroHighlights: ["Handmade in Bangladesh", "Unique resin patterns", "Gift-ready packaging"],
    heroStats: [
      { label: "Handcrafted units", to: 1500, suffix: "+" },
      { label: "Customer rating", to: 4.9, suffix: "/5" },
      { label: "Unique designs", to: 100, suffix: "%" }
    ],
    orderTitleBn: "অর্ডার ফর্ম",
    orderTitleEn: "Order Form",
    orderBody: "Fill in your details to receive a secure payment link and instant SMS confirmation.",
    formCta: "Pay with Stripe",
    formCtaLoading: "Redirecting...",
    formConsent: "By continuing, you agree to receive a one-time SMS confirmation.",
    requiredFieldsError: "Name, email, and phone are required.",
    addressFieldsError: "Address and city are required.",
    invalidPhoneError: "Valid Bangladeshi phone number required (01XXXXXXXXX).",
    optionsRequiredError: "Please select all required options.",
    codSuccess: "Your COD order is received. We will call to confirm shortly.",
    codFailure: "Unable to place COD order. Please try again.",
    manualProofError: "Please upload a payment screenshot.",
    manualTxnError: "Please enter a transaction ID.",
    manualSuccess: "Manual payment submitted. We will verify and confirm.",
    codCta: "Confirm COD Order",
    manualCta: "Submit Payment Proof",
    paymentStripe: "Pay instantly with Stripe",
    paymentManual: "Manual payment (Bank / bKash / Nagad)",
    manualNote: "Send the exact order amount and upload the payment screenshot.",
    txnLabel: "Transaction ID",
    proofLabel: "Payment screenshot",
    deliveryInside: "Inside Dhaka",
    deliveryOutside: "Outside Dhaka",
    selectProduct: "Select product",
    productHint: "Choose the product you want",
    formName: "Full name",
    formEmail: "Email address",
    formPhone: "Phone number",
    formAddress: "Address",
    formCity: "City",
    formArea: "Area",
    codLabel: "Cash on delivery",
    codNote: "We will call to confirm your order.",
    orderSummary: "Order summary",
    summarySubtotal: "Subtotal",
    summaryGiftWrap: "Gift wrap",
    summaryShipping: "Shipping",
    summaryTotal: "Total"
  },
  bn: {
    navProduct: "প্রোডাক্ট",
    navReviews: "রিভিউ",
    navDemo: "ডেমো",
    navCheckout: "অর্ডার",
    heroBadge: "Sahariar's Pen - Handmade Resin",
    heroCtaPrimary: "আপনার পেন অর্ডার করুন",
    heroCtaSecondary: "কাজটি দেখুন",
    heroHighlights: ["বাংলাদেশে হাতে তৈরি", "ইউনিক রেজিন প্যাটার্ন", "গিফট-রেডি প্যাকেজিং"],
    heroStats: [
      { label: "হ্যান্ডক্রাফটেড", to: 1500, suffix: "+" },
      { label: "রেটিং", to: 4.9, suffix: "/5" },
      { label: "ইউনিক ডিজাইন", to: 100, suffix: "%" }
    ],
    orderTitleBn: "অর্ডার ফর্ম",
    orderTitleEn: "Order Form",
    orderBody: "আপনার তথ্য দিন, আমরা সিকিউর পেমেন্ট লিংক পাঠাবো এবং পেমেন্টের পর SMS কনফার্মেশন যাবে।",
    formCta: "Stripe দিয়ে পেমেন্ট",
    formCtaLoading: "রিডাইরেক্ট হচ্ছে...",
    formConsent: "এগিয়ে গেলে আপনি একবারের SMS কনফার্মেশনে সম্মতি দিচ্ছেন।",
    requiredFieldsError: "নাম, ইমেইল এবং ফোন নাম্বার দিতে হবে।",
    addressFieldsError: "ঠিকানা এবং জেলা লিখুন।",
    invalidPhoneError: "সঠিক বাংলাদেশি ফোন নম্বর দিন (01XXXXXXXXX)।",
    optionsRequiredError: "সব অপশন নির্বাচন করুন।",
    codSuccess: "আপনার COD অর্ডার গ্রহণ করা হয়েছে। শিগগিরই কল করে কনফার্ম করা হবে।",
    codFailure: "COD অর্ডার দেওয়া যায়নি। আবার চেষ্টা করুন।",
    manualProofError: "পেমেন্ট স্ক্রিনশট আপলোড করুন।",
    manualTxnError: "ট্রান্স্যাকশন আইডি লিখুন।",
    manualSuccess: "ম্যানুয়াল পেমেন্ট সাবমিট হয়েছে। ভেরিফাই করে কনফার্ম করা হবে।",
    codCta: "COD অর্ডার কনফার্ম করুন",
    manualCta: "পেমেন্ট প্রুফ সাবমিট করুন",
    paymentStripe: "Stripe দিয়ে সাথে সাথে পেমেন্ট",
    paymentManual: "ম্যানুয়াল পেমেন্ট (ব্যাংক / bKash / Nagad)",
    manualNote: "অর্ডার এমাউন্ট অনুযায়ী পেমেন্ট করে স্ক্রিনশট আপলোড করুন।",
    txnLabel: "ট্রান্স্যাকশন আইডি",
    proofLabel: "পেমেন্ট স্ক্রিনশট",
    deliveryInside: "ঢাকার ভিতরে",
    deliveryOutside: "ঢাকার বাইরে",
    selectProduct: "পণ্য নির্বাচন",
    productHint: "পছন্দের পণ্যটি বেছে নিন",
    formName: "পূর্ণ নাম",
    formEmail: "ইমেইল ঠিকানা",
    formPhone: "ফোন নম্বর",
    formAddress: "ঠিকানা",
    formCity: "জেলা",
    formArea: "থানা/এলাকা",
    codLabel: "ক্যাশ অন ডেলিভারি",
    codNote: "অর্ডার কনফার্মের জন্য আমরা কল করবো।",
    orderSummary: "অর্ডার সারাংশ",
    summarySubtotal: "সাবটোটাল",
    summaryGiftWrap: "গিফট র‍্যাপ",
    summaryShipping: "ডেলিভারি",
    summaryTotal: "মোট"
  }
};
function Counter({ to, suffix = "", locale }: { to: number; suffix?: string; locale: "en-BD" | "bn-BD" }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const raw = to * eased;
      const next = Number.isInteger(to) ? Math.round(raw) : Number(raw.toFixed(1));
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return (
    <span>
      {value.toLocaleString(locale)}
      {suffix}
    </span>
  );
}

function trackEvent(name: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ name, payload: payload || {} });
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }
  fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => undefined);
}

function pickWeighted(variants: ExperimentVariant[]) {
  const total = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
  const roll = Math.random() * (total || 1);
  let running = 0;
  for (const variant of variants) {
    running += variant.weight || 0;
    if (roll <= running) return variant;
  }
  return variants[0];
}

type Props = { config: SiteConfig };

export default function Home({ config }: Props) {
  const [lang, setLang] = useState<Lang>("bn");
  const t = ui[lang];
  const [abVariant, setAbVariant] = useState<ExperimentVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [giftWrap, setGiftWrap] = useState(false);
  const [cod, setCod] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "manual">("stripe");
  const [deliveryZone, setDeliveryZone] = useState<"insideDhaka" | "outsideDhaka">("insideDhaka");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const optionGroups = config.optionGroups ?? [];
  useEffect(() => {
    const next: Record<string, string> = {};
    optionGroups.forEach((group) => {
      next[group.id] = group.options[0] || "";
    });
    setSelectedOptions(next);
  }, [optionGroups]);

  const activeExperiment: Experiment | undefined = useMemo(
    () => config.experiments?.find((exp) => exp.active),
    [config.experiments]
  );
  useEffect(() => {
    if (!activeExperiment || !activeExperiment.variants?.length) return;
    const key = `exp_${activeExperiment.id}`;
    const stored = window.localStorage.getItem(key);
    const pick = activeExperiment.variants.find((v) => v.id === stored) || pickWeighted(activeExperiment.variants);
    setAbVariant(pick);
    window.localStorage.setItem(key, pick.id);
    trackEvent("ab_exposure", { experiment: activeExperiment.id, variant: pick.id });
  }, [activeExperiment]);

  const displayConfig = useMemo(() => {
    if (!abVariant?.copy) return config;
    return {
      ...config,
      promoText: abVariant.copy.promoText ?? config.promoText,
      topNotice: abVariant.copy.topNotice ?? config.topNotice,
      heroTitle: { ...config.heroTitle, ...(abVariant.copy.heroTitle || {}) },
      heroBody: { ...config.heroBody, ...(abVariant.copy.heroBody || {}) },
      heroCtaPrimary: { ...config.heroCtaPrimary, ...(abVariant.copy.heroCtaPrimary || {}) },
      heroCtaSecondary: { ...config.heroCtaSecondary, ...(abVariant.copy.heroCtaSecondary || {}) },
      finalCtaTitle: { ...config.finalCtaTitle, ...(abVariant.copy.finalCtaTitle || {}) },
      finalCtaBody: { ...config.finalCtaBody, ...(abVariant.copy.finalCtaBody || {}) },
      finalCtaButton: { ...config.finalCtaButton, ...(abVariant.copy.finalCtaButton || {}) }
    };
  }, [config, abVariant]);

  const featureFlags = displayConfig.features || {
    inventoryEnabled: false,
    variantImagesEnabled: false,
    multiProductEnabled: false,
    categoriesEnabled: false
  };

  const activeProduct = useMemo(() => {
    if (!featureFlags.multiProductEnabled) return null;
    return (
      displayConfig.products?.find((product) => product.id === selectedProductId) ||
      displayConfig.products?.find((product) => product.id === displayConfig.activeProductId) ||
      displayConfig.products?.[0] ||
      null
    );
  }, [displayConfig.activeProductId, displayConfig.products, featureFlags.multiProductEnabled, selectedProductId]);

  useEffect(() => {
    if (!featureFlags.multiProductEnabled) return;
    if (!displayConfig.products?.length) return;
    if (!selectedProductId) {
      setSelectedProductId(displayConfig.activeProductId || displayConfig.products[0].id);
    }
  }, [displayConfig.activeProductId, displayConfig.products, featureFlags.multiProductEnabled, selectedProductId]);

  const basePrice = activeProduct?.basePrice ?? displayConfig.priceBdt ?? 4999;
  const optionFees = useMemo(() => {
    return optionGroups.reduce(
      (acc, group) => {
        const selected = selectedOptions[group.id];
        const fee = displayConfig.priceModifiers?.[group.id]?.[selected] ?? 0;
        acc[group.id] = fee;
        acc.total += fee;
        return acc;
      },
      { total: 0 } as Record<string, number> & { total: number }
    );
  }, [optionGroups, selectedOptions, displayConfig.priceModifiers]);

  const unitPrice = basePrice + optionFees.total;
  const subtotal = unitPrice * quantity;
  const giftWrapFee = giftWrap ? 120 : 0;
  const rawShippingFee =
    deliveryZone === "insideDhaka"
      ? displayConfig.shippingFees?.insideDhaka ?? 0
      : displayConfig.shippingFees?.outsideDhaka ?? 0;
  const freeDeliveryQty = displayConfig.freeDeliveryThresholdQty ?? 0;
  const shippingFee = freeDeliveryQty > 0 && quantity >= freeDeliveryQty ? 0 : rawShippingFee;
  const total = subtotal + giftWrapFee + shippingFee;

  const orderDisabled = featureFlags.inventoryEnabled && (activeProduct?.outOfStock || (activeProduct?.stock ?? 0) <= 0);
  const variantImageUrl = useMemo(() => {
    if (!featureFlags.variantImagesEnabled) return "";
    for (const group of optionGroups) {
      const selected = selectedOptions[group.id];
      const mapped = displayConfig.variantImages?.[group.id]?.[selected];
      if (mapped) return mapped;
    }
    return "";
  }, [featureFlags.variantImagesEnabled, optionGroups, selectedOptions, displayConfig.variantImages]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (orderDisabled) {
      setError(lang === "bn" ? "এই পণ্যটি বর্তমানে স্টকে নেই।" : "This product is currently out of stock.");
      setLoading(false);
      return;
    }
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      area: String(formData.get("area") || "").trim(),
      note: String(formData.get("note") || "").trim(),
      transactionId: String(formData.get("transactionId") || "").trim(),
      quantity,
      giftWrap,
      cod,
      deliveryZone,
      paymentMethod,
      productId: featureFlags.multiProductEnabled ? (selectedProductId || activeProduct?.id || "") : "",
      selectedOptions
    };

    const phoneOk = /^01[3-9]\d{8}$/.test(payload.phone);
    const allOptionsSelected = optionGroups.every((group) => !!selectedOptions[group.id]);

    if (!payload.name || !payload.email || !payload.phone) {
      setError(t.requiredFieldsError);
      setLoading(false);
      return;
    }
    if (!phoneOk) {
      setError(t.invalidPhoneError);
      setLoading(false);
      return;
    }
    if (!allOptionsSelected) {
      setError(t.optionsRequiredError);
      setLoading(false);
      return;
    }
    if (!payload.address || !payload.city) {
      setError(t.addressFieldsError);
      setLoading(false);
      return;
    }

    if (cod) {
      const response = await fetch("/api/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, total })
      });
      if (!response.ok) {
        setError(t.codFailure);
      } else {
        setSuccess(t.codSuccess);
      }
      setLoading(false);
      return;
    }

    if (paymentMethod === "manual") {
      const proof = formData.get("paymentProof");
      if (!(proof instanceof File) || proof.size === 0) {
        setError(t.manualProofError);
        setLoading(false);
        return;
      }
      if (!payload.transactionId) {
        setError(t.manualTxnError);
        setLoading(false);
        return;
      }
      const manualForm = new FormData();
      manualForm.append("paymentProof", proof);
      manualForm.append("payload", JSON.stringify({ ...payload, total }));
      const response = await fetch("/api/payment-proof", { method: "POST", body: manualForm });
      if (!response.ok) {
        setError("Unable to submit payment proof.");
      } else {
        setSuccess(t.manualSuccess);
      }
      setLoading(false);
      return;
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, total })
    });
    if (!response.ok) {
      setError("Unable to start checkout.");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  };

  const localizedReviews: Review[] = useMemo(() => {
    return (displayConfig.reviews || []).map((review) => ({
      ...review,
      bn: lang === "bn" ? review.bn : review.en,
      en: review.en
    }));
  }, [displayConfig.reviews, lang]);
  return (
    <Layout
      lang={lang}
      onLangChange={setLang}
      labels={{
        product: t.navProduct,
        reviews: t.navReviews,
        demo: t.navDemo,
        checkout: t.navCheckout,
        subtitle: displayConfig.tagline
      }}
      title={displayConfig.seoTitle}
      description={displayConfig.seoDescription}
      image={displayConfig.seoImage}
      siteUrl={displayConfig.siteUrl}
      socials={displayConfig.social}
      promoEnabled={displayConfig.promoEnabled}
      promoText={displayConfig.promoText}
      brandName={displayConfig.brandName}
      logoUrl={displayConfig.logoUrl}
      footerText={displayConfig.footerText}
    >
      <section className="section pt-6">
        <div className="rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">
          {displayConfig.topNotice}
        </div>
      </section>

      <section className="section pt-10 pb-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-soft border border-slate-200">
              {t.heroBadge}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 leading-tight tracking-tight">
              {lang === "bn" ? displayConfig.heroTitle.bn : displayConfig.heroTitle.en}
            </h1>
            <p className="text-lg md:text-xl text-slate-600">
              {lang === "bn" ? displayConfig.heroBody.bn : displayConfig.heroBody.en}
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#order"
                className="relative rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 px-7 py-3 text-white font-semibold shadow-xl animate-order-shake"
              >
                {lang === "bn" ? displayConfig.heroCtaPrimary.bn : displayConfig.heroCtaPrimary.en}
              </a>
              <a href="#video" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-slate-700 font-semibold">
                {lang === "bn" ? displayConfig.heroCtaSecondary.bn : displayConfig.heroCtaSecondary.en}
              </a>
            </div>
            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              {t.heroStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-soft border border-slate-200">
                  <div className="text-2xl font-semibold text-slate-900">
                    <Counter to={stat.to} suffix={stat.suffix} locale={lang === "bn" ? "bn-BD" : "en-BD"} />
                  </div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-8 space-y-6">
            <div className="text-sm font-semibold text-slate-600">What you get</div>
            <ul className="space-y-3 text-slate-700">
              {t.heroHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="rounded-2xl bg-slate-900 text-white p-6">
              <div className="text-sm uppercase tracking-wide text-white/70">Today's price</div>
              <div className="text-3xl font-semibold mt-2">BDT {total.toLocaleString("en-BD")}</div>
              <div className="text-sm text-white/80">Delivery fee based on zone</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pb-14">
        <div className="card p-8 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                Media Library
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Real product photos</h2>
                <p className="text-slate-600">Each product is unique. These are real photos from recent batches.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setLightboxSrc(variantImageUrl || displayConfig.gallery[0]?.url || "")}
                className="md:row-span-2 md:col-span-2 rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 relative text-left"
              >
                <Image
                  src={variantImageUrl || displayConfig.gallery[0]?.url || "/gallery/gallery-main.png"}
                  alt={displayConfig.gallery[0]?.caption || "Resin pen showcase"}
                  className="h-full w-full object-cover"
                  width={1200}
                  height={900}
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                />
              </button>
              {displayConfig.gallery.slice(1).map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => setLightboxSrc(item.url)}
                  className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <Image src={item.url} alt={item.caption} width={600} height={600} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {lightboxSrc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
          <button type="button" onClick={() => setLightboxSrc(null)} className="absolute inset-0" aria-label="Close preview" />
          <div className="relative max-w-4xl w-full">
            <Image src={lightboxSrc} alt="Preview" width={1200} height={900} className="w-full max-h-[80vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {featureFlags.multiProductEnabled && displayConfig.products?.length ? (
        <section className="section pb-10">
          <div className="card p-8">
            <h2 className="text-2xl font-semibold text-ink">{t.selectProduct}</h2>
            <p className="text-sm text-slate-500">{t.productHint}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {displayConfig.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    product.id === (selectedProductId || activeProduct?.id)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{product.name}</div>
                  <div className={`text-xs ${product.id === (selectedProductId || activeProduct?.id) ? "text-white/70" : "text-slate-500"}`}>
                    {product.subtitle}
                  </div>
                  <div className="mt-2 text-lg font-semibold">BDT {product.basePrice.toLocaleString("en-BD")}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Product
        heading={lang === "bn" ? displayConfig.productHeading.bn : displayConfig.productHeading.en}
        subheading={lang === "bn" ? displayConfig.productSubheading.bn : displayConfig.productSubheading.en}
        description={lang === "bn" ? displayConfig.productBody.bn : displayConfig.productBody.en}
        features={displayConfig.productFeatures || []}
        cardTitle={activeProduct?.name || displayConfig.productCardTitle.en}
        cardDescription={activeProduct?.description || displayConfig.productCardBody.en}
        price={`BDT ${basePrice.toLocaleString("en-BD")}`}
        priceNote="One-time purchase"
        imageUrl={variantImageUrl || displayConfig.signatureImage}
      />

      <Reviews
        heading={lang === "bn" ? displayConfig.reviewsHeading.bn : displayConfig.reviewsHeading.en}
        description={lang === "bn" ? displayConfig.reviewsBody.bn : displayConfig.reviewsBody.en}
        reviews={localizedReviews}
        googleRating={displayConfig.googleRating}
        googleReviewCount={displayConfig.googleReviewCount}
        googleReviewUrl={displayConfig.googleReviewUrl}
      />

      <Video heading="Video" description="Craft video" videoUrl={displayConfig.youtubeUrl} />
      <section id="order" className="section py-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-8">
            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-sm">
              <span className="font-semibold text-slate-900">{t.orderTitleBn}</span>
              <span className="text-slate-300">•</span>
              <span>{t.orderTitleEn}</span>
            </div>
            <p className="mt-2 text-slate-600">{t.orderBody}</p>
            <form onSubmit={handleCheckout} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input name="name" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formName} required />
                <input name="email" type="email" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formEmail} required />
                <input name="phone" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formPhone} required />
                <input name="address" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formAddress} required />
                <input name="city" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formCity} required />
                <input name="area" className="rounded-xl border border-slate-200 px-4 py-3" placeholder={t.formArea} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />
                <select
                  value={deliveryZone}
                  onChange={(e) => setDeliveryZone(e.target.value as "insideDhaka" | "outsideDhaka")}
                  className="rounded-xl border border-slate-200 px-4 py-3"
                >
                  <option value="insideDhaka">{t.deliveryInside}</option>
                  <option value="outsideDhaka">{t.deliveryOutside}</option>
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                {optionGroups.map((group) => (
                  <div key={group.id}>
                    <div className="text-sm font-semibold text-slate-700">{lang === "bn" ? group.labelBn : group.labelEn}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.options.map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.id]: option }))}
                          className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                            selectedOptions[group.id] === option
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {option}
                          {displayConfig.recommended?.[group.id]?.includes(option) ? (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Recommended</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} /> Gift wrap
                </label>
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} /> {t.codLabel}
                </label>
                <div className="mt-2 text-xs text-slate-500">{t.codNote}</div>
                <div className="mt-4 text-sm font-semibold">{t.paymentStripe}</div>
                <div className="text-xs text-slate-500">{t.paymentManual}</div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="stripe"
                    checked={paymentMethod === "stripe"}
                    onChange={() => setPaymentMethod("stripe")}
                  />
                  Stripe
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="manual"
                    checked={paymentMethod === "manual"}
                    onChange={() => setPaymentMethod("manual")}
                  />
                  Manual
                </label>
                {paymentMethod === "manual" && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold">{t.manualNote}</div>
                    <div className="mt-2">Bank: {displayConfig.merchant.bankName}</div>
                    <div>Account Name: {displayConfig.merchant.accountName}</div>
                    <div>Account No: {displayConfig.merchant.accountNumber}</div>
                    <div>Branch: {displayConfig.merchant.branch}</div>
                    <div>bKash: {displayConfig.merchant.bkash}</div>
                    <div>Nagad: {displayConfig.merchant.nagad}</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <input name="transactionId" className="rounded-lg border border-slate-200 px-3 py-2" placeholder={t.txnLabel} />
                      <input name="paymentProof" type="file" accept="image/*" className="rounded-lg border border-slate-200 px-3 py-2" />
                    </div>
                  </div>
                )}
              </div>
              <textarea name="note" rows={3} className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Order note" />
              {error && <div className="text-sm text-rose-600">{error}</div>}
              {success && <div className="text-sm text-emerald-600">{success}</div>}
              <button type="submit" disabled={loading || orderDisabled} className="rounded-full bg-slate-900 px-6 py-3 text-white font-semibold">
                {loading ? t.formCtaLoading : cod ? t.codCta : paymentMethod === "manual" ? t.manualCta : t.formCta}
              </button>
              <p className="text-xs text-slate-500">{t.formConsent}</p>
            </form>
          </div>
          <div className="card p-8 h-fit">
            <div className="text-sm font-semibold text-slate-600">{t.orderSummary}</div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>{t.summarySubtotal}</span><span>BDT {subtotal.toLocaleString("en-BD")}</span></div>
              <div className="flex items-center justify-between"><span>{t.summaryGiftWrap}</span><span>BDT {giftWrapFee.toLocaleString("en-BD")}</span></div>
              <div className="flex items-center justify-between"><span>{t.summaryShipping}</span><span>BDT {shippingFee.toLocaleString("en-BD")}</span></div>
              <div className="flex items-center justify-between text-slate-900 font-semibold text-base"><span>{t.summaryTotal}</span><span>BDT {total.toLocaleString("en-BD")}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pb-20">
        <div className="rounded-3xl bg-slate-900 text-white p-10 md:p-14 grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-center shadow-2xl">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-4xl font-semibold">
              {lang === "bn" ? displayConfig.finalCtaTitle.bn : displayConfig.finalCtaTitle.en}
            </h2>
            <p className="text-white/70">{lang === "bn" ? displayConfig.finalCtaBody.bn : displayConfig.finalCtaBody.en}</p>
          </div>
          <a
            href="#order"
            className="justify-self-start rounded-full bg-white px-8 py-3 text-slate-900 font-semibold shadow-lg"
          >
            {lang === "bn" ? displayConfig.finalCtaButton.bn : displayConfig.finalCtaButton.en}
          </a>
        </div>
      </section>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const config = await getConfig();
  return { props: { config } };
};
