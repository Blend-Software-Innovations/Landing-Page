export default function Video({ heading, description, videoUrl }: { heading: string; description: string; videoUrl: string }) {
  return (
    <section id="video" className="section py-20">
      <div className="card p-8 md:p-10">
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-ink">{heading}</h2>
          <p className="mt-2 text-slate-600">{description}</p>
        </div>
        <div className="mt-6 aspect-video overflow-hidden rounded-2xl border border-slate-200">
          <iframe
            className="h-full w-full"
            src={videoUrl}
            title="Product video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
