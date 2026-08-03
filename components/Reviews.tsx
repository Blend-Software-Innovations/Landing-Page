import type { Review } from "../lib/siteConfig";

export default function Reviews({
  heading,
  description,
  reviews,
  googleRating,
  googleReviewCount,
  googleReviewUrl
}: {
  heading: string;
  description: string;
  reviews: Review[];
  googleRating: number;
  googleReviewCount: number;
  googleReviewUrl: string;
}) {
  return (
    <section id="reviews" className="section py-20">
      <div className="card p-8 md:p-10 space-y-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink">{heading}</h2>
          <p className="mt-2 text-slate-600">{description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <div key={`${review.name}-${review.role}`} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{review.name}</div>
                <div className="text-amber-500 text-xs">
                  {"★".repeat(Math.max(1, Math.min(5, Math.round(review.rating))))}
                </div>
              </div>
              <div className="text-xs text-slate-500">{review.role}</div>
              <p className="mt-3 text-sm text-slate-600">{review.bn || review.en}</p>
            </div>
          ))}
        </div>
        {googleRating > 0 && googleReviewCount > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Google rating</div>
              <div className="text-slate-900 font-semibold">{googleRating} / 5</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Total reviews</div>
              <div className="text-slate-900 font-semibold">{googleReviewCount}+</div>
            </div>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
              >
                See Google Reviews
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
