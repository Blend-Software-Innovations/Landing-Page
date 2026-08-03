export default function Product({
  heading,
  subheading,
  description,
  features,
  cardTitle,
  cardDescription,
  price,
  priceNote,
  imageUrl,
  badges = ["In-stock", "Fast delivery", "Easy return"],
  stockStatus
}: {
  heading: string;
  subheading: string;
  description: string;
  features: string[];
  cardTitle: string;
  cardDescription: string;
  price: string;
  priceNote: string;
  imageUrl: string;
  badges?: string[];
  stockStatus?: { label: string; tone: "ok" | "warn" };
}) {
  return (
    <section id="product" className="section py-20">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-soft border border-slate-200">
            {subheading}
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink">{heading}</h2>
          <p className="text-lg text-slate-600">{description}</p>
          <ul className="grid gap-3 text-slate-700">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-slate-900" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <img
            src={imageUrl}
            alt={cardTitle}
            loading="lazy"
            className="w-full rounded-xl object-cover border border-slate-200"
          />
          <div className="mt-6 space-y-3">
            <div className="text-xl font-semibold text-ink">{cardTitle}</div>
            <p className="text-slate-600">{cardDescription}</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold text-ink">{price}</span>
              <span className="text-sm text-slate-500">{priceNote}</span>
            </div>
            {stockStatus && (
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  stockStatus.tone === "warn"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {stockStatus.label}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
