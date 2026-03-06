
import { useEffect, useRef, useState, type ReactNode } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { SiteConfig, Review } from "../lib/siteConfig";
import { normalizeSections } from "../lib/siteConfig";
import { materializeVariants } from "../lib/variants";
import { applyTemplate, templates } from "../lib/templates";

function getAuthHeaders() {
  if (typeof document === "undefined") return {} as Record<string, string>;
  const match = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("csrf_token="));
  const token = match ? decodeURIComponent(match.split("=")[1] || "") : "";
  return token ? ({ "x-csrf-token": token } as Record<string, string>) : ({} as Record<string, string>);
}

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["PACKED", "CANCELED"],
  PACKED: ["SHIPPED", "CANCELED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELED: [],
  RETURNED: []
};

function getOrderStatusOptions(current: string) {
  const next = ORDER_STATUS_FLOW[current] || [];
  return [current, ...next];
}

function Section({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-sm text-slate-500">{hint}</p>}
        </div>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="space-y-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3"
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="space-y-2 text-sm text-slate-600">
      <span className="font-semibold text-slate-700">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3"
      />
    </label>
  );
}
export default function AdminDashboard() {
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [role, setRole] = useState<string>("none");
  const [status, setStatus] = useState("Loading...");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<{ total: number; last7Days: number; events: Record<string, number> } | null>(null);
  const [auditLog, setAuditLog] = useState<Array<{ id: string; createdAt: string; actor?: string; role?: string; data?: SiteConfig }>>([]);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || "");
  const [orders, setOrders] = useState<any[]>([]);
  const [manualFilter, setManualFilter] = useState<"ALL" | "PENDING" | "VERIFIED" | "REJECTED">("PENDING");
  const [manualSummary, setManualSummary] = useState<{ pending: number; verified: number; rejected: number } | null>(null);
  const [otpMetrics, setOtpMetrics] = useState<Array<{ phone: string; lastRequested?: string; attempts: number; pending: number; cooldownUntil?: string; lockedUntil?: string }>>([]);
  const [otpSearch, setOtpSearch] = useState("");
  const [holds, setHolds] = useState<any[]>([]);
  const [partnerInput, setPartnerInput] = useState("");
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const canWrite = role === "admin" || role === "owner";
  const canManageOrders = role === "admin" || role === "owner";
  const canManageInventory = role === "admin" || role === "owner";

  const loadConfig = async () => {
    const headers = getAuthHeaders();
    const sessionRes = await fetch("/api/admin/session", { headers });
    const session = (await sessionRes.json()) as { role?: string };
    if (!sessionRes.ok || !session.role || session.role === "none") {
      setRole("none");
      setStatus("Unauthorized. Please login.");
      return;
    }
    setRole(session.role);
    const response = await fetch("/api/admin/config", { headers });
    if (!response.ok) {
      setStatus("Unable to load configuration.");
      return;
    }
    const data = (await response.json()) as SiteConfig;
    setConfig(data);
    setStatus("Ready");
  };

  const loadAnalytics = async () => {
    const response = await fetch("/api/admin/analytics-summary", { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { total: number; last7Days: number; events: Record<string, number> };
    setAnalytics(data);
  };

  const loadAudit = async () => {
    const response = await fetch("/api/admin/audit?limit=12", { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { entries?: Array<{ id: string; createdAt: string; actor?: string; role?: string; data?: SiteConfig }> };
    setAuditLog(data.entries || []);
  };

  const loadOrders = async () => {
    const query =
      manualFilter === "ALL"
        ? "&paymentMethod=MANUAL"
        : `&paymentMethod=MANUAL&manualStatus=${manualFilter}`;
    const response = await fetch(`/api/admin/orders?limit=20${query}`, { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { orders?: any[] };
    setOrders(data.orders || []);
  };

  const loadManualSummary = async () => {
    const response = await fetch("/api/admin/manual-review-summary", { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { pending: number; verified: number; rejected: number };
    setManualSummary(data);
  };

  const loadOtpMetrics = async () => {
    const response = await fetch("/api/admin/otp-metrics", { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { rows?: Array<any> };
    setOtpMetrics(data.rows || []);
  };

  const loadHolds = async () => {
    const response = await fetch("/api/admin/holds", { headers: getAuthHeaders() });
    if (!response.ok) return;
    const data = (await response.json()) as { holds?: any[] };
    setHolds(data.holds || []);
  };

  useEffect(() => {
        loadConfig()
          .then(() => {
            loadAnalytics();
            loadAudit();
            loadOrders();
            loadManualSummary();
            loadOtpMetrics();
            loadHolds();
          })
          .catch(() => setStatus("Unable to load configuration."));
      }, []);

    useEffect(() => {
      loadOrders();
    }, [manualFilter]);

  useEffect(() => {
    if (!config || !dirty || !canWrite) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      const validationError = validateVariants(config.variants || []);
      if (validationError) {
        setStatus(validationError);
        return;
      }
      setSaving(true);
      try {
        const response = await fetch("/api/admin/config?autosave=1", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(config)
        });
        if (response.ok) {
          setDirty(false);
          setStatus("Saved");
        } else {
          setStatus("Autosave failed");
        }
      } catch {
        setStatus("Autosave failed");
      } finally {
        setSaving(false);
      }
    }, 700);
  }, [config, dirty, canWrite]);

  const updateConfig = (next: SiteConfig) => {
    setConfig(next);
    setDirty(true);
    setStatus("Not saved yet");
  };

  const validateVariants = (items: SiteConfig["variants"]) => {
    const seen = new Set<string>();
    for (const variant of items) {
      if (!variant.sku) return "Variant SKU is required.";
      if (seen.has(variant.sku)) return "Duplicate variant SKU detected.";
      seen.add(variant.sku);
      if (variant.stockQty < 0) return "Variant stock cannot be negative.";
      if (variant.weight !== undefined && variant.weight < 0) return "Variant weight cannot be negative.";
      if (variant.price < 0) return "Variant price cannot be negative.";
    }
    return null;
  };

  const applySectionDefaults = (product: { name?: string; subtitle?: string; badge?: string }) => {
    const base = normalizeSections();
    return base.map((section) => {
      if (section.type === "offer") {
        return {
          ...section,
          settings: { ...section.settings, text: product.badge || product.subtitle || product.name || "Limited batch" }
        };
      }
      if (section.type === "sticky_buy") {
        return {
          ...section,
          settings: { ...section.settings, text: product.name ? `Order ${product.name}` : "Order now" }
        };
      }
      return section;
    });
  };

  const formatDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const handleManualSave = async () => {
    if (!config) return;
    const validationError = validateVariants(config.variants || []);
    if (validationError) {
      setStatus(validationError);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setDirty(false);
        setStatus("Saved");
      } else {
        setStatus("Save failed");
      }
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: getAuthHeaders(),
      body: form
    });
    if (!response.ok) throw new Error("Upload failed");
    return (await response.json()) as { url: string };
  };

  if (status === "Loading...") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">Loading admin dashboard...</div>
    );
  }

  if (!config || role === "none") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Control Center</h1>
          <p className="text-sm text-slate-500">Secure access required. Please login with admin credentials.</p>
          <button
            onClick={() => router.push("/admin/login")}
            className="rounded-full bg-slate-900 px-6 py-3 text-white font-semibold"
          >
            Open Admin Login
          </button>
        </div>
      </div>
    );
  }

  const gallery = config.gallery || [];
  const reviews = config.reviews || [];
  const products = config.products || [];
  const optionGroups = config.optionGroups || [];
  const variants = config.variants || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Admin Dashboard</title>
      </Head>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="rounded-3xl bg-slate-900 text-white p-6 md:p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm uppercase tracking-wide text-white/60">Admin Control Center</div>
              <h1 className="text-3xl font-semibold">Enterprise Landing Page Manager</h1>
              <p className="text-sm text-white/70">Role: {role}. {canWrite ? "You can edit everything." : "Read-only mode."}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs rounded-full px-3 py-1 ${dirty ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"}`}>
                {dirty ? "Not saved yet" : "All changes saved"}
              </span>
              <button
                onClick={handleManualSave}
                disabled={!canWrite || saving}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                {saving ? "Saving..." : "Save now"}
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.push("/admin/login");
                }}
                className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/90"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {["Brand Setup", "Media & Products", "Checkout & Publish"].map((step, index) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase text-slate-400">Step {index + 1}</div>
              <div className="text-sm font-semibold text-slate-800">{step}</div>
            </div>
          ))}
        </div>
        <Section title="Quick guide" hint="Non-technical steps to keep your landing page updated.">
          <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">
            <li>Update brand name, logo, and promo line.</li>
            <li>Refresh gallery and product photos.</li>
            <li>Set price, delivery fee, and options.</li>
            <li>Review the order form and publish.</li>
          </ol>
        </Section>

        <Section title="Templates" hint="Pick a ready-made template for common product types.">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Template</span>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                {templates.find((t) => t.id === templateId)?.description}
              </div>
            </label>
            <button
              type="button"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              onClick={() => {
                const next = applyTemplate(config, templateId);
                updateConfig({ ...next, sections: normalizeSections(next.sections) });
              }}
            >
              Apply template
            </button>
          </div>
        </Section>

        <Section title="Landing Sections" hint="Reorder and toggle sections that appear on the landing page.">
          <div className="space-y-3">
            {(normalizeSections(config.sections) || []).map((section, index) => (
              <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-800">{section.type}</div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(e) => {
                          const next = normalizeSections(config.sections).map((s) =>
                            s.id === section.id ? { ...s, enabled: e.target.checked } : s
                          );
                          updateConfig({ ...config, sections: next });
                        }}
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs"
                      onClick={() => {
                        const next = normalizeSections(config.sections);
                        if (index === 0) return;
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        next.forEach((s, i) => (s.order = i + 1));
                        updateConfig({ ...config, sections: next });
                      }}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-2 py-1 text-xs"
                      onClick={() => {
                        const next = normalizeSections(config.sections);
                        if (index === next.length - 1) return;
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        next.forEach((s, i) => (s.order = i + 1));
                        updateConfig({ ...config, sections: next });
                      }}
                    >
                      Down
                    </button>
                  </div>
                </div>
                {section.type === "offer" && (
                  <InputField
                    label="Offer text"
                    value={String(section.settings?.text || "")}
                    onChange={(v) => {
                      const next = normalizeSections(config.sections).map((s) =>
                        s.id === section.id ? { ...s, settings: { ...(s.settings || {}), text: v } } : s
                      );
                      updateConfig({ ...config, sections: next });
                    }}
                  />
                )}
                {section.type === "countdown" && (
                  <InputField
                    label="Countdown end date (YYYY-MM-DD)"
                    value={String(section.settings?.endDate || "")}
                    onChange={(v) => {
                      const next = normalizeSections(config.sections).map((s) =>
                        s.id === section.id ? { ...s, settings: { ...(s.settings || {}), endDate: v } } : s
                      );
                      updateConfig({ ...config, sections: next });
                    }}
                  />
                )}
                {section.type === "faq" && (
                  <TextAreaField
                    label="FAQ items (JSON array)"
                    value={JSON.stringify(section.settings?.items || [], null, 2)}
                    onChange={(v) => {
                      let items: any[] = [];
                      try {
                        const parsed = JSON.parse(v);
                        if (Array.isArray(parsed)) items = parsed;
                      } catch {
                        items = [];
                      }
                      const next = normalizeSections(config.sections).map((s) =>
                        s.id === section.id ? { ...s, settings: { ...(s.settings || {}), items } } : s
                      );
                      updateConfig({ ...config, sections: next });
                    }}
                  />
                )}
                {section.type === "sticky_buy" && (
                  <InputField
                    label="Sticky bar text"
                    value={String(section.settings?.text || "")}
                    onChange={(v) => {
                      const next = normalizeSections(config.sections).map((s) =>
                        s.id === section.id ? { ...s, settings: { ...(s.settings || {}), text: v } } : s
                      );
                      updateConfig({ ...config, sections: next });
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brand & Hero" hint="These fields appear at the top of the landing page.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Brand name" value={config.brandName} onChange={(v) => updateConfig({ ...config, brandName: v })} />
            <InputField label="Tagline" value={config.tagline} onChange={(v) => updateConfig({ ...config, tagline: v })} />
            <InputField label="Logo URL" value={config.logoUrl} onChange={(v) => updateConfig({ ...config, logoUrl: v })} placeholder="/uploads/logo.jpg" />
            <InputField label="Promo text" value={config.promoText} onChange={(v) => updateConfig({ ...config, promoText: v })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label="Hero title (EN)" value={config.heroTitle.en} onChange={(v) => updateConfig({ ...config, heroTitle: { ...config.heroTitle, en: v } })} />
            <TextAreaField label="Hero title (BN)" value={config.heroTitle.bn} onChange={(v) => updateConfig({ ...config, heroTitle: { ...config.heroTitle, bn: v } })} />
            <TextAreaField label="Hero body (EN)" value={config.heroBody.en} onChange={(v) => updateConfig({ ...config, heroBody: { ...config.heroBody, en: v } })} />
            <TextAreaField label="Hero body (BN)" value={config.heroBody.bn} onChange={(v) => updateConfig({ ...config, heroBody: { ...config.heroBody, bn: v } })} />
            <div className="space-y-2">
              <InputField label="Signature image" value={config.signatureImage} onChange={(v) => updateConfig({ ...config, signatureImage: v })} />
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                Upload signature image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await handleUpload(file);
                      updateConfig({ ...config, signatureImage: result.url });
                    } catch {
                      setStatus("Signature image upload failed");
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="SEO & Links" hint="Search engines + sharing info.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Site URL" value={config.siteUrl} onChange={(v) => updateConfig({ ...config, siteUrl: v })} />
            <InputField label="SEO title" value={config.seoTitle} onChange={(v) => updateConfig({ ...config, seoTitle: v })} />
            <TextAreaField label="SEO description" value={config.seoDescription} onChange={(v) => updateConfig({ ...config, seoDescription: v })} />
            <div className="space-y-2">
              <InputField label="SEO image" value={config.seoImage} onChange={(v) => updateConfig({ ...config, seoImage: v })} />
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer">
                Upload SEO image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const result = await handleUpload(file);
                      updateConfig({ ...config, seoImage: result.url });
                    } catch {
                      setStatus("SEO image upload failed");
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="WhatsApp" value={config.social.whatsapp} onChange={(v) => updateConfig({ ...config, social: { ...config.social, whatsapp: v } })} />
            <InputField label="Facebook" value={config.social.facebook} onChange={(v) => updateConfig({ ...config, social: { ...config.social, facebook: v } })} />
            <InputField label="Instagram" value={config.social.instagram} onChange={(v) => updateConfig({ ...config, social: { ...config.social, instagram: v } })} />
            <InputField label="YouTube" value={config.social.youtube} onChange={(v) => updateConfig({ ...config, social: { ...config.social, youtube: v } })} />
          </div>
        </Section>
        <Section title="Pricing & Delivery" hint="Set the base price and delivery fees.">
          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="Base price (BDT)"
              value={String(config.priceBdt)}
              onChange={(v) => updateConfig({ ...config, priceBdt: Number(v || 0) })}
            />
            <InputField
              label="Inside Dhaka delivery"
              value={String(config.shippingFees.insideDhaka)}
              onChange={(v) => updateConfig({ ...config, shippingFees: { ...config.shippingFees, insideDhaka: Number(v || 0) } })}
            />
            <InputField
              label="Outside Dhaka delivery"
              value={String(config.shippingFees.outsideDhaka)}
              onChange={(v) => updateConfig({ ...config, shippingFees: { ...config.shippingFees, outsideDhaka: Number(v || 0) } })}
            />
          </div>
          <InputField
            label="Free delivery threshold (quantity)"
            value={String(config.freeDeliveryThresholdQty)}
            onChange={(v) => updateConfig({ ...config, freeDeliveryThresholdQty: Number(v || 0) })}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={config.shippingRules?.enabled}
                onChange={(e) =>
                  updateConfig({
                    ...config,
                    shippingRules: { ...config.shippingRules, enabled: e.target.checked }
                  })
                }
              />
              Enable weight-based shipping
            </label>
            <div className="text-xs text-slate-500">Unit: grams (g)</div>
            <div className="space-y-3">
              {(config.shippingRules?.tiers || []).map((tier, index) => (
                <div key={`${tier.maxWeight}-${index}`} className="grid gap-3 md:grid-cols-4">
                  <InputField
                    label="Max weight (g)"
                    value={String(tier.maxWeight)}
                    onChange={(v) => {
                      const next = [...(config.shippingRules?.tiers || [])];
                      next[index] = { ...tier, maxWeight: Number(v || 0) };
                      updateConfig({ ...config, shippingRules: { ...config.shippingRules, tiers: next } });
                    }}
                  />
                  <InputField
                    label="Inside Dhaka fee"
                    value={String(tier.insideDhaka)}
                    onChange={(v) => {
                      const next = [...(config.shippingRules?.tiers || [])];
                      next[index] = { ...tier, insideDhaka: Number(v || 0) };
                      updateConfig({ ...config, shippingRules: { ...config.shippingRules, tiers: next } });
                    }}
                  />
                  <InputField
                    label="Outside Dhaka fee"
                    value={String(tier.outsideDhaka)}
                    onChange={(v) => {
                      const next = [...(config.shippingRules?.tiers || [])];
                      next[index] = { ...tier, outsideDhaka: Number(v || 0) };
                      updateConfig({ ...config, shippingRules: { ...config.shippingRules, tiers: next } });
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                    onClick={() => {
                      const next = (config.shippingRules?.tiers || []).filter((_, idx) => idx !== index);
                      updateConfig({ ...config, shippingRules: { ...config.shippingRules, tiers: next } });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => {
                const next = [
                  ...(config.shippingRules?.tiers || []),
                  { maxWeight: 2000, insideDhaka: 200, outsideDhaka: 260 }
                ];
                updateConfig({ ...config, shippingRules: { ...config.shippingRules, tiers: next } });
              }}
            >
              Add weight tier
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-700">Delivery partners (shown for COD)</div>
            <div className="flex flex-wrap gap-2">
              {(config.deliveryPartners || []).map((partner) => (
                <span key={partner} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {partner}
                  <button
                    type="button"
                    className="text-rose-500"
                    onClick={() => {
                      const next = (config.deliveryPartners || []).filter((item) => item !== partner);
                      updateConfig({ ...config, deliveryPartners: next });
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={partnerInput}
                onChange={(e) => setPartnerInput(e.target.value)}
                placeholder="Add partner (e.g., Pathao)"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  const value = partnerInput.trim();
                  if (!value) return;
                  const current = config.deliveryPartners || [];
                  if (!current.includes(value)) {
                    updateConfig({ ...config, deliveryPartners: [...current, value] });
                  }
                  setPartnerInput("");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </Section>

        <Section title="Options" hint="Option groups appear in the order form.">
          <div className="space-y-4">
            {optionGroups.map((group, index) => (
              <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <InputField
                    label="Group ID"
                    value={group.id}
                    onChange={(v) => {
                      const next = [...optionGroups];
                      next[index] = { ...group, id: v };
                      updateConfig({ ...config, optionGroups: next });
                    }}
                  />
                  <InputField
                    label="Label EN"
                    value={group.labelEn}
                    onChange={(v) => {
                      const next = [...optionGroups];
                      next[index] = { ...group, labelEn: v };
                      updateConfig({ ...config, optionGroups: next });
                    }}
                  />
                  <InputField
                    label="Label BN"
                    value={group.labelBn}
                    onChange={(v) => {
                      const next = [...optionGroups];
                      next[index] = { ...group, labelBn: v };
                      updateConfig({ ...config, optionGroups: next });
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                    onClick={() => {
                      const next = optionGroups.filter((_, idx) => idx !== index);
                      updateConfig({ ...config, optionGroups: next });
                    }}
                  >
                    Remove group
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => (
                    <span key={option} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {option}
                    </span>
                  ))}
                </div>
                <InputField
                  label="Options (comma separated)"
                  value={group.options.join(", ")}
                  onChange={(v) => {
                    const next = [...optionGroups];
                    next[index] = { ...group, options: v.split(",").map((item) => item.trim()).filter(Boolean) };
                    updateConfig({ ...config, optionGroups: next });
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const next = [...optionGroups, { id: `option-${optionGroups.length + 1}`, labelEn: "Option", labelBn: "অপশন", options: ["Default"] }];
                updateConfig({ ...config, optionGroups: next });
              }}
            >
              Add option group
            </button>
          </div>
        </Section>

        <Section title="Materialized variants" hint="Generate variants from option groups and edit stock/SKU/weight/images.">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const next = materializeVariants(optionGroups, config.priceBdt, config.priceModifiers || {});
                updateConfig({ ...config, variants: next });
              }}
            >
              Generate variants
            </button>
            <span className="text-xs text-slate-500">Existing variants: {variants.length}</span>
          </div>
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={variant.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-xs text-slate-500">
                  Options:{" "}
                  {Object.entries(variant.optionValues || {})
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ")}
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <InputField
                    label="SKU"
                    value={variant.sku}
                    onChange={(v) => {
                      const next = [...variants];
                      next[index] = { ...variant, sku: v };
                      updateConfig({ ...config, variants: next });
                    }}
                  />
                  <InputField
                    label="Stock qty"
                    value={String(variant.stockQty)}
                    onChange={(v) => {
                      const next = [...variants];
                      next[index] = { ...variant, stockQty: Math.max(0, Number(v || 0)) };
                      updateConfig({ ...config, variants: next });
                    }}
                  />
                  <InputField
                    label="Weight (g)"
                    value={variant.weight ? String(variant.weight) : ""}
                    onChange={(v) => {
                      const next = [...variants];
                      next[index] = { ...variant, weight: v ? Number(v) : undefined };
                      updateConfig({ ...config, variants: next });
                    }}
                  />
                  <InputField
                    label="Price (BDT)"
                    value={String(variant.price)}
                    onChange={(v) => {
                      const next = [...variants];
                      next[index] = { ...variant, price: Math.max(0, Number(v || 0)) };
                      updateConfig({ ...config, variants: next });
                    }}
                  />
                </div>
                <InputField
                  label="Images (comma separated URLs)"
                  value={(variant.images || []).join(", ")}
                  onChange={(v) => {
                    const next = [...variants];
                    next[index] = { ...variant, images: v.split(",").map((item) => item.trim()).filter(Boolean) };
                    updateConfig({ ...config, variants: next });
                  }}
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Products" hint="Enable multi-product mode to sell multiple items.">
          <div className="flex flex-wrap gap-3 text-sm">
            {(["inventoryEnabled", "variantImagesEnabled", "multiProductEnabled", "categoriesEnabled", "otpEnabled"] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  checked={config.features[flag]}
                  onChange={(e) => updateConfig({ ...config, features: { ...config.features, [flag]: e.target.checked } })}
                />
                <span>{flag}</span>
              </label>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Active product</span>
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
              value={config.activeProductId}
              onChange={(e) => {
                const id = e.target.value;
                const product = products.find((item) => item.id === id) || products[0];
                const nextSections = applySectionDefaults(product || {});
                updateConfig({ ...config, activeProductId: id, sections: nextSections });
              }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Selecting a product refreshes landing sections.</span>
          </div>
          <div className="space-y-4">
            {products.map((product, index) => (
              <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Product name" value={product.name} onChange={(v) => {
                    const next = [...products];
                    next[index] = { ...product, name: v };
                    updateConfig({ ...config, products: next });
                  }} />
                  <InputField label="Subtitle" value={product.subtitle} onChange={(v) => {
                    const next = [...products];
                    next[index] = { ...product, subtitle: v };
                    updateConfig({ ...config, products: next });
                  }} />
                  <InputField label="Base price" value={String(product.basePrice)} onChange={(v) => {
                    const next = [...products];
                    next[index] = { ...product, basePrice: Number(v || 0) };
                    updateConfig({ ...config, products: next });
                  }} />
                  <InputField label="Stock" value={String(product.stock)} onChange={(v) => {
                    const next = [...products];
                    next[index] = { ...product, stock: Number(v || 0) };
                    updateConfig({ ...config, products: next });
                  }} />
                </div>
                <TextAreaField label="Description" value={product.description} onChange={(v) => {
                  const next = [...products];
                  next[index] = { ...product, description: v };
                  updateConfig({ ...config, products: next });
                }} />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={product.outOfStock} onChange={(e) => {
                    const next = [...products];
                    next[index] = { ...product, outOfStock: e.target.checked };
                    updateConfig({ ...config, products: next });
                  }} />
                  Mark as out of stock
                </label>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                  onClick={() => {
                    const next = products.filter((_, idx) => idx !== index);
                    updateConfig({ ...config, products: next });
                  }}
                >
                  Remove product
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const next = [...products, {
                  id: `product-${Date.now()}`,
                  name: "New product",
                  subtitle: "",
                  description: "",
                  basePrice: 0,
                  category: "",
                  stock: 0,
                  outOfStock: false,
                  badge: ""
                }];
                updateConfig({ ...config, products: next, activeProductId: next[0].id });
              }}
            >
              Add product
            </button>
          </div>
        </Section>
        <Section title="Gallery" hint="Upload and reorder product images.">
          <div className="flex flex-wrap gap-3">
            <label className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 cursor-pointer">
              Upload images
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  if (!e.target.files) return;
                  const files = Array.from(e.target.files);
                  for (const file of files) {
                    const uploaded = await handleUpload(file);
                    const next = [...gallery, { url: uploaded.url, caption: "" }];
                    updateConfig({ ...config, gallery: next });
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {gallery.map((item, index) => (
              <div
                key={`${item.url}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  const next = [...gallery];
                  const [moved] = next.splice(dragIndex, 1);
                  next.splice(index, 0, moved);
                  setDragIndex(null);
                  updateConfig({ ...config, gallery: next });
                }}
              >
                <img src={item.url} alt={item.caption || "gallery"} className="h-40 w-full object-cover rounded-xl" />
                <input
                  value={item.caption}
                  onChange={(e) => {
                    const next = [...gallery];
                    next[index] = { ...item, caption: e.target.value };
                    updateConfig({ ...config, gallery: next });
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  placeholder="Caption"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-xs"
                    onClick={() => {
                      if (index === 0) return;
                      const next = [...gallery];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      updateConfig({ ...config, gallery: next });
                    }}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-2 py-1 text-xs"
                    onClick={() => {
                      if (index === gallery.length - 1) return;
                      const next = [...gallery];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      updateConfig({ ...config, gallery: next });
                    }}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-600"
                    onClick={() => {
                      const next = gallery.filter((_, idx) => idx !== index);
                      updateConfig({ ...config, gallery: next });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Reviews" hint="Update customer testimonials.">
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div key={`${review.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Name" value={review.name} onChange={(v) => {
                    const next = [...reviews];
                    next[index] = { ...review, name: v };
                    updateConfig({ ...config, reviews: next });
                  }} />
                  <InputField label="Role" value={review.role} onChange={(v) => {
                    const next = [...reviews];
                    next[index] = { ...review, role: v };
                    updateConfig({ ...config, reviews: next });
                  }} />
                  <InputField label="Rating (1-5)" value={String(review.rating)} onChange={(v) => {
                    const next = [...reviews];
                    next[index] = { ...review, rating: Number(v || 0) };
                    updateConfig({ ...config, reviews: next });
                  }} />
                </div>
                <TextAreaField label="Review (BN)" value={review.bn} onChange={(v) => {
                  const next = [...reviews];
                  next[index] = { ...review, bn: v };
                  updateConfig({ ...config, reviews: next });
                }} />
                <TextAreaField label="Review (EN)" value={review.en} onChange={(v) => {
                  const next = [...reviews];
                  next[index] = { ...review, en: v };
                  updateConfig({ ...config, reviews: next });
                }} />
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">Preview</div>
                  <div className="text-sm font-semibold">{review.name}</div>
                  <div className="text-xs text-amber-500">{"★".repeat(Math.max(1, Math.min(5, Math.round(review.rating))))}</div>
                  <div className="text-xs text-slate-500">{review.role}</div>
                  <p className="text-sm text-slate-600 mt-2">{review.bn}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                  onClick={() => {
                    const next = reviews.filter((_, idx) => idx !== index);
                    updateConfig({ ...config, reviews: next });
                  }}
                >
                  Remove review
                </button>
              </div>
            ))}
            <button
              type="button"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => {
                const next: Review[] = [...reviews, { name: "New customer", role: "", rating: 5, bn: "", en: "" }];
                updateConfig({ ...config, reviews: next });
              }}
            >
              Add review
            </button>
          </div>
        </Section>

        <Section title="OTP Security" hint="Tune OTP behavior and review per-phone stats.">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 grid gap-4 md:grid-cols-3 text-sm">
            <InputField
              label="OTP cooldown (sec)"
              value={String(config.otpSettings?.cooldownSec ?? 60)}
              onChange={(v) =>
                updateConfig({
                  ...config,
                  otpSettings: { ...config.otpSettings, cooldownSec: Math.max(10, Number(v || 0)) }
                })
              }
            />
            <InputField
              label="OTP lockout attempts"
              value={String(config.otpSettings?.lockoutAttempts ?? 5)}
              onChange={(v) =>
                updateConfig({
                  ...config,
                  otpSettings: { ...config.otpSettings, lockoutAttempts: Math.max(1, Number(v || 0)) }
                })
              }
            />
            <InputField
              label="OTP lockout minutes"
              value={String(config.otpSettings?.lockoutMin ?? 10)}
              onChange={(v) =>
                updateConfig({
                  ...config,
                  otpSettings: { ...config.otpSettings, lockoutMin: Math.max(1, Number(v || 0)) }
                })
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
              onClick={loadOtpMetrics}
            >
              Refresh OTP metrics
            </button>
            <a
              href="/api/admin/otp-metrics-csv"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
            >
              Export CSV
            </a>
            <input
              value={otpSearch}
              onChange={(e) => setOtpSearch(e.target.value)}
              placeholder="Search phone"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 text-xs">
            {otpMetrics
              .filter((row) => (otpSearch ? row.phone.includes(otpSearch.trim()) : true))
              .map((row) => (
              <div key={row.phone} className="rounded-2xl border border-slate-200 bg-white p-3 flex flex-wrap gap-3 items-center justify-between">
                <div className="font-semibold text-slate-700">{row.phone}</div>
                <div className="text-slate-500">Attempts: {row.attempts}</div>
                <div className="text-slate-500">Pending OTPs: {row.pending}</div>
                {row.cooldownUntil && (
                  <div className="text-amber-600">Cooldown until {new Date(row.cooldownUntil).toLocaleString()}</div>
                )}
                {row.lockedUntil && (
                  <div className="text-rose-600">Locked until {new Date(row.lockedUntil).toLocaleString()}</div>
                )}
                {row.lastRequested && (
                  <div className="text-slate-400">Last: {new Date(row.lastRequested).toLocaleString()}</div>
                )}
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold"
                  onClick={async () => {
                    await fetch("/api/admin/otp-reset", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ phone: row.phone })
                    });
                    loadOtpMetrics();
                  }}
                >
                  Reset lockout
                </button>
              </div>
            ))}
            {!otpMetrics.length && <div className="text-slate-500">No OTP activity yet.</div>}
          </div>
        </Section>

        <Section title="Merchant & Payments" hint="Manual payment details shown to customers.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Bank name" value={config.merchant.bankName} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, bankName: v } })} />
            <InputField label="Account name" value={config.merchant.accountName} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, accountName: v } })} />
            <InputField label="Account number" value={config.merchant.accountNumber} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, accountNumber: v } })} />
            <InputField label="Branch" value={config.merchant.branch} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, branch: v } })} />
            <InputField label="bKash" value={config.merchant.bkash} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, bkash: v } })} />
            <InputField label="Nagad" value={config.merchant.nagad} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, nagad: v } })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={config.paymentProviders?.bkash}
                onChange={(e) => updateConfig({ ...config, paymentProviders: { ...config.paymentProviders, bkash: e.target.checked } })}
              />
              Enable bKash payment link
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={config.paymentProviders?.nagad}
                onChange={(e) => updateConfig({ ...config, paymentProviders: { ...config.paymentProviders, nagad: e.target.checked } })}
              />
              Enable Nagad payment link
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={config.paymentProviders?.rocket}
                onChange={(e) => updateConfig({ ...config, paymentProviders: { ...config.paymentProviders, rocket: e.target.checked } })}
              />
              Enable Rocket payment link
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="bKash link base URL"
              value={config.paymentLinks?.bkash || ""}
              onChange={(v) => updateConfig({ ...config, paymentLinks: { ...config.paymentLinks, bkash: v } })}
              placeholder="https://pay.bkash.com/?"
            />
            <InputField
              label="Nagad link base URL"
              value={config.paymentLinks?.nagad || ""}
              onChange={(v) => updateConfig({ ...config, paymentLinks: { ...config.paymentLinks, nagad: v } })}
              placeholder="https://app.nagad.com.bd/pay?"
            />
            <InputField
              label="Rocket link base URL"
              value={config.paymentLinks?.rocket || ""}
              onChange={(v) => updateConfig({ ...config, paymentLinks: { ...config.paymentLinks, rocket: v } })}
              placeholder="https://rocket.example.com/pay?"
            />
          </div>
        </Section>

        <Section title="Footer & Notice" hint="Footer copy and top notice bar.">
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField label="Top notice" value={config.topNotice} onChange={(v) => updateConfig({ ...config, topNotice: v })} />
            <TextAreaField label="Footer text" value={config.footerText} onChange={(v) => updateConfig({ ...config, footerText: v })} />
            <InputField label="YouTube embed URL" value={config.youtubeUrl} onChange={(v) => updateConfig({ ...config, youtubeUrl: v })} />
            <InputField label="Google review URL" value={config.googleReviewUrl} onChange={(v) => updateConfig({ ...config, googleReviewUrl: v })} />
          </div>
        </Section>

          <Section title="Orders" hint="Manage order status and print packing slip.">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                <span>Manual review filter</span>
                <select
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
                  value={manualFilter}
                  onChange={(e) => setManualFilter(e.target.value as any)}
                >
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ALL">All manual</option>
                </select>
              </label>
              {manualSummary && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Pending: {manualSummary.pending}
                </span>
              )}
              <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold" onClick={loadOrders}>
                Refresh orders
              </button>
            <a
              href="/api/admin/orders-csv"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
            >
              Export CSV
            </a>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{order.customerName}</div>
                    <div className="text-xs text-slate-500">{order.phone}</div>
                    <div className="text-xs text-slate-500">BDT {order.total}</div>
                    {order.paymentLink ? (
                      <a href={order.paymentLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                        Payment link
                      </a>
                    ) : null}
                    {order.callStatus && (
                      <div className="text-xs text-slate-500">Call: {order.callStatus}</div>
                    )}
                    {order.fraudFlags?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {order.fraudFlags.map((flag: string) => (
                          <span key={flag} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={order.callStatus || "PENDING"}
                        onChange={(e) => {
                          const next = orders.map((item) =>
                            item.id === order.id ? { ...item, callStatus: e.target.value } : item
                          );
                          setOrders(next);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        disabled={!canManageOrders}
                      >
                        <option value="PENDING">Call Pending</option>
                        <option value="VERIFIED">Call Verified</option>
                        <option value="UNVERIFIED">Call Unverified</option>
                      </select>
                      <input
                        value={order.callNotes || ""}
                        onChange={(e) => {
                          const next = orders.map((item) =>
                            item.id === order.id ? { ...item, callNotes: e.target.value } : item
                          );
                          setOrders(next);
                        }}
                        placeholder="Call notes"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        disabled={!canManageOrders}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!canManageOrders) return;
                          await fetch("/api/admin/call-verification", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                            body: JSON.stringify({
                              orderId: order.id,
                              status: order.callStatus || "PENDING",
                              notes: order.callNotes || ""
                            })
                          });
                          loadOrders();
                        }}
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                        disabled={!canManageOrders}
                      >
                        Save call status
                      </button>
                      <select
                        value={order.status}
                        onChange={async (e) => {
                          if (!canManageOrders) return;
                          await fetch("/api/admin/order-status", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                            body: JSON.stringify({ orderId: order.id, status: e.target.value })
                          });
                          loadOrders();
                          loadHolds();
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        disabled={!canManageOrders}
                      >
                      {getOrderStatusOptions(order.status).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                      <input
                        value={order.trackingCode || ""}
                        onChange={(e) => {
                          const next = orders.map((item) =>
                            item.id === order.id ? { ...item, trackingCode: e.target.value } : item
                          );
                          setOrders(next);
                        }}
                        placeholder="Tracking code"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        disabled={!canManageOrders}
                      />
                      <select
                        value={order.shippingPartner || ""}
                        onChange={(e) => {
                          const next = orders.map((item) =>
                            item.id === order.id ? { ...item, shippingPartner: e.target.value } : item
                          );
                          setOrders(next);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        disabled={!canManageOrders}
                      >
                        <option value="">Courier</option>
                        {(config?.deliveryPartners || []).map((partner) => (
                          <option key={partner} value={partner}>
                            {partner}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!canManageOrders) return;
                          await fetch("/api/admin/order-tracking", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                            body: JSON.stringify({
                              orderId: order.id,
                              trackingCode: order.trackingCode || "",
                              shippingPartner: order.shippingPartner || ""
                            })
                          });
                          loadOrders();
                        }}
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                        disabled={!canManageOrders}
                      >
                        Update tracking
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!canManageOrders) return;
                          const response = await fetch("/api/admin/courier-create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                            body: JSON.stringify({ orderId: order.id, partner: order.shippingPartner || "" })
                          });
                          if (!response.ok) {
                            const data = (await response.json().catch(() => ({}))) as { error?: string };
                            setStatus(data.error || "Courier API failed");
                            return;
                          }
                          loadOrders();
                        }}
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                        disabled={!canManageOrders || !order.shippingPartner}
                      >
                        Create shipment
                      </button>
                    <a
                      href={`/admin/packing/${order.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      Packing slip
                    </a>
                    <a
                      href={`/admin/label/${order.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      Label
                    </a>
                      <a
                        href={`/admin/invoice/${order.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        Invoice
                      </a>
                      <a
                        href={`/api/admin/invoice-pdf?id=${order.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold"
                      >
                        Invoice PDF
                      </a>
                  </div>
                  </div>
                  {order.paymentMethod === "MANUAL" && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            Manual payment — {order.manualStatus || "PENDING"}
                          </div>
                          {order.transactionId && <div>Txn ID: {order.transactionId}</div>}
                          {order.manualProofUrl && (
                            <a
                              href={order.manualProofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              View payment proof
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                            onClick={async () => {
                              if (!canManageOrders) return;
                              const note = window.prompt("Verification note (optional)") || "";
                              await fetch("/api/admin/manual-payment-review", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                                body: JSON.stringify({ orderId: order.id, status: "VERIFIED", note })
                              });
                              loadOrders();
                              loadManualSummary();
                            }}
                            disabled={!canManageOrders}
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                            onClick={async () => {
                              if (!canManageOrders) return;
                              const note = window.prompt("Rejection reason (optional)") || "";
                              await fetch("/api/admin/manual-payment-review", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                                body: JSON.stringify({ orderId: order.id, status: "REJECTED", note })
                              });
                              loadOrders();
                              loadManualSummary();
                            }}
                            disabled={!canManageOrders}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    {[
                      { label: "Placed", value: order.createdAt },
                      { label: "Confirmed", value: order.confirmedAt },
                      { label: "Packed", value: order.packedAt },
                      { label: "Shipped", value: order.shippedAt },
                      { label: "Delivered", value: order.deliveredAt },
                      { label: "Canceled", value: order.canceledAt },
                      { label: "Returned", value: order.returnedAt }
                    ]
                      .filter((item) => formatDate(item.value))
                      .map((item) => (
                        <span key={item.label} className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {item.label}: {formatDate(item.value)}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

        <Section title="Inventory holds" hint="Release stuck reservations if needed.">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold" onClick={loadHolds}>
              Refresh holds
            </button>
          </div>
          <div className="space-y-3">
            {holds.map((hold) => (
              <div key={hold.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="font-semibold text-slate-700">
                    {hold.variant?.product?.name || "Product"} — {hold.variant?.name || hold.variantId}
                  </div>
                  <div>
                    Qty {hold.quantity} • Expires {new Date(hold.expiresAt).toLocaleString()}
                  </div>
                  {hold.order && (
                    <div className="text-slate-500">
                      Linked order: {hold.order.id} • Status {hold.order.status}
                    </div>
                  )}
                </div>
                  <button
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                    onClick={async () => {
                      if (!canManageInventory) return;
                      await fetch("/api/admin/holds-release", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify({ holdId: hold.id })
                      });
                      loadHolds();
                    }}
                    disabled={!canManageInventory}
                  >
                    Release
                  </button>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Analytics summary" hint="Live event counts from landing page.">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
              onClick={loadAnalytics}
            >
              Refresh analytics
            </button>
            {analytics && (
              <div className="text-sm text-slate-600">
                Total events: {analytics.total} • Last 7 days: {analytics.last7Days}
              </div>
            )}
          </div>
          {analytics && (
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(analytics.events || {}).map(([name, count]) => (
                <div key={name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">{name}</div>
                  <div className="text-lg font-semibold text-slate-900">{count}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Audit log" hint="See changes and restore previous versions.">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
              onClick={loadAudit}
            >
              Refresh audit log
            </button>
          </div>
          <div className="space-y-3">
            {auditLog.map((entry) => (
              <details key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  {new Date(entry.createdAt).toLocaleString()} — {entry.actor || "system"}
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="font-semibold text-slate-700 mb-2">Before</div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(entry.data, null, 2)}</pre>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="font-semibold text-slate-700 mb-2">Current</div>
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(config, null, 2)}</pre>
                  </div>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    className="mt-3 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                    onClick={async () => {
                      await fetch(`/api/admin/rollback?id=${entry.id}`, { headers: getAuthHeaders() });
                      loadConfig();
                    }}
                  >
                    Rollback to this version
                  </button>
                )}
              </details>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
