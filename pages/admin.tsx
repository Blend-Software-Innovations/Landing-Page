
import { useEffect, useRef, useState, type ReactNode } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { SiteConfig, Review } from "../lib/siteConfig";
import { applyTemplate, templates } from "../lib/templates";

function getAuthHeaders() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const token = localStorage.getItem("admin_token") || "";
  const basic = localStorage.getItem("admin_basic") || "";
  const headers: Record<string, string> = {};
  if (token) headers["x-admin-token"] = token;
  if (basic) headers.Authorization = `Basic ${basic}`;
  return headers;
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
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const canWrite = role === "admin";

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

  useEffect(() => {
    loadConfig()
      .then(() => {
        loadAnalytics();
        loadAudit();
      })
      .catch(() => setStatus("Unable to load configuration."));
  }, []);

  useEffect(() => {
    if (!config || !dirty || !canWrite) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
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

  const handleManualSave = async () => {
    if (!config) return;
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
                updateConfig(next);
              }}
            >
              Apply template
            </button>
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
          </div>
        </Section>

        <Section title="SEO & Links" hint="Search engines + sharing info.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Site URL" value={config.siteUrl} onChange={(v) => updateConfig({ ...config, siteUrl: v })} />
            <InputField label="SEO title" value={config.seoTitle} onChange={(v) => updateConfig({ ...config, seoTitle: v })} />
            <TextAreaField label="SEO description" value={config.seoDescription} onChange={(v) => updateConfig({ ...config, seoDescription: v })} />
            <InputField label="SEO image" value={config.seoImage} onChange={(v) => updateConfig({ ...config, seoImage: v })} />
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

        <Section title="Products" hint="Enable multi-product mode to sell multiple items.">
          <div className="flex flex-wrap gap-3 text-sm">
            {(["inventoryEnabled", "variantImagesEnabled", "multiProductEnabled", "categoriesEnabled"] as const).map((flag) => (
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

        <Section title="Merchant & Payments" hint="Manual payment details shown to customers.">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Bank name" value={config.merchant.bankName} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, bankName: v } })} />
            <InputField label="Account name" value={config.merchant.accountName} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, accountName: v } })} />
            <InputField label="Account number" value={config.merchant.accountNumber} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, accountNumber: v } })} />
            <InputField label="Branch" value={config.merchant.branch} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, branch: v } })} />
            <InputField label="bKash" value={config.merchant.bkash} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, bkash: v } })} />
            <InputField label="Nagad" value={config.merchant.nagad} onChange={(v) => updateConfig({ ...config, merchant: { ...config.merchant, nagad: v } })} />
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
