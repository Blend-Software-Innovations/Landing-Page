import Head from "next/head";
import { ReactNode } from "react";

export default function Layout({
  children,
  title,
  description,
  image,
  siteUrl,
  socials,
  promoText,
  promoEnabled,
  lang,
  onLangChange,
  labels,
  brandName,
  logoUrl,
  footerText
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  image?: string;
  siteUrl?: string;
  socials?: {
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  promoText?: string;
  promoEnabled?: boolean;
  lang?: "en" | "bn";
  onLangChange?: (lang: "en" | "bn") => void;
  labels?: {
    product?: string;
    reviews?: string;
    demo?: string;
    checkout?: string;
    subtitle?: string;
  };
  brandName?: string;
  logoUrl?: string;
  footerText?: string;
}) {
  const navLabels = {
    product: labels?.product ?? "Product",
    reviews: labels?.reviews ?? "Reviews",
    demo: labels?.demo ?? "Demo",
    checkout: labels?.checkout ?? "Checkout",
    subtitle: labels?.subtitle ?? "Quality products, delivered fast."
  };
  const brand = brandName ?? "Our Store";
  const pageTitle = title || brand;
  const metaDescription = description || "";
  const footer = footerText ?? "Secure checkout by Stripe. SMS confirmations by Twilio.";
  const canonical =
    siteUrl?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "";
  const ogImage = image || "";
  const whatsappLink = socials?.whatsapp
    ? `https://wa.me/${socials.whatsapp.replace(/[^0-9]/g, "")}`
    : "";
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:title" content={pageTitle} />
        {metaDescription && <meta property="og:description" content={metaDescription} />}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="bn_BD" />
        {canonical && <meta property="og:url" content={canonical} />}
        {ogImage && <meta property="og:image" content={canonical ? `${canonical}${ogImage}` : ogImage} />}
        <meta property="og:site_name" content={brand} />
        <meta name="twitter:card" content="summary_large_image" />
        {ogImage && <meta name="twitter:image" content={canonical ? `${canonical}${ogImage}` : ogImage} />}
      </Head>
      <div className="min-h-screen page-shell">
        {promoEnabled && promoText && (
          <div className="w-full bg-[color:var(--color-ink)] text-white text-xs sm:text-sm">
            <div className="section py-2 flex items-center justify-center">
              <span className="font-semibold tracking-wide">{promoText}</span>
            </div>
          </div>
        )}
        <header className="section pt-6">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-soft backdrop-blur">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${brand} logo`}
                      className="h-12 w-12 rounded-2xl object-cover border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-[linear-gradient(150deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] text-white flex items-center justify-center font-semibold text-lg shadow-soft">
                      {brand.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white border border-slate-200 shadow" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[color:var(--color-ink)]">{brand}</div>
                  <div className="text-sm text-slate-600">{navLabels.subtitle}</div>
                </div>
              </div>
              <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-700">
                <a href="#product" className="inline-flex min-h-11 items-center transition hover:text-[color:var(--color-accent)]">{navLabels.product}</a>
                <a href="#reviews" className="inline-flex min-h-11 items-center transition hover:text-[color:var(--color-accent)]">{navLabels.reviews}</a>
                <a href="#video" className="inline-flex min-h-11 items-center transition hover:text-[color:var(--color-accent)]">{navLabels.demo}</a>
                <a href="#order" className="inline-flex min-h-11 items-center transition hover:text-[color:var(--color-accent)]">{navLabels.checkout}</a>
              </nav>
              {lang && onLangChange && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => onLangChange("en")}
                    className={`rounded-full px-3 py-1 transition ${
                      lang === "en"
                        ? "bg-[color:var(--color-accent)] text-white"
                        : "border border-[color:var(--color-hairline)] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-accent)]"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => onLangChange("bn")}
                    className={`rounded-full px-3 py-1 transition ${
                      lang === "bn"
                        ? "bg-[color:var(--color-accent)] text-white"
                        : "border border-[color:var(--color-hairline)] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-accent)]"
                    }`}
                  >
                    বাংলা
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:translate-y-[-1px] focus:outline-none focus:ring-4 focus:ring-emerald-200"
            aria-label="Chat on WhatsApp"
          >
            WhatsApp
          </a>
        )}
        <footer className="mt-10 border-t border-[color:var(--color-ink)] bg-[color:var(--color-ink)] py-8 text-sm text-white">
          <div className="section">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <span className="font-semibold text-white/90">
                (c) {new Date().getFullYear()} {brand}. All rights reserved.
              </span>
              <div className="flex flex-wrap items-center gap-3 text-white/80">
                <span>{footer}</span>
                <div className="flex items-center gap-3 text-white/70">
                  {whatsappLink && (
                    <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-white">
                      WhatsApp
                    </a>
                  )}
                  {socials?.facebook && (
                    <a href={socials.facebook} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-white">
                      Facebook
                    </a>
                  )}
                  {socials?.instagram && (
                    <a href={socials.instagram} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-white">
                      Instagram
                    </a>
                  )}
                  {socials?.tiktok && (
                    <a href={socials.tiktok} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-white">
                      TikTok
                    </a>
                  )}
                  {socials?.youtube && (
                    <a href={socials.youtube} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-white">
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
