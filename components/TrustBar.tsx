import type { ReactNode } from "react";

type TrustItem = {
  title: string;
  note: string;
  icon: "cod" | "delivery" | "genuine" | "return";
};

// The four objections a Bangladeshi online buyer raises before ordering:
// "do I pay first?", "when will it arrive?", "is it the real thing?", and
// "what if it's wrong?". Answering them above the fold is what converts —
// so this sits directly under the hero rather than in a footer.
const icons: Record<TrustItem["icon"], ReactNode> = {
  cod: (
    <>
      <rect x="2.5" y="6" width="19" height="12.5" rx="2.5" />
      <circle cx="12" cy="12.25" r="2.75" />
    </>
  ),
  delivery: (
    <>
      <path d="M2.5 7.5h11v9h-11z" />
      <path d="M13.5 11h4l3 3v2.5h-7z" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="17" cy="18" r="1.75" />
    </>
  ),
  genuine: (
    <>
      <path d="M12 2.75 20 6v6c0 4.4-3.2 7.6-8 9.25C7.2 19.6 4 16.4 4 12V6z" />
      <path d="m8.75 12 2.25 2.25 4.25-4.5" />
    </>
  ),
  return: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4v5h5" />
    </>
  )
};

export default function TrustBar({ items }: { items: TrustItem[] }) {
  if (!items.length) return null;
  return (
    <section className="section pb-14">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={item.title}
            className={`reveal reveal-delay-${Math.min(index, 3)} lift-on-hover flex items-start gap-3 rounded-2xl border border-[color:var(--color-hairline)] bg-white p-4`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 stroke-[color:var(--color-trust)]"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icons[item.icon]}
            </svg>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[color:var(--color-ink)]">{item.title}</div>
              <div className="text-xs text-[color:var(--color-ink-muted)]">{item.note}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
