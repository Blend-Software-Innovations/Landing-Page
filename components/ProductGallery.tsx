import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryItem } from "../lib/siteConfig";

type Props = {
  items: GalleryItem[];
  productName: string;
  lang: "en" | "bn";
  onOpenLightbox?: (url: string) => void;
};

// Product gallery: multiple angles per colour, swipeable on mobile.
//
// Built for the actual audience — most Bangladeshi traffic is mid-range Android
// on mobile data — so the "3D" is CSS transforms, not WebGL. A 3D bundle costs
// more conversions on a slow connection than the effect wins. The tilt is
// pointer-driven and desktop-only; touch devices get swipe instead, which is
// what a thumb expects. Everything collapses under prefers-reduced-motion.
export default function ProductGallery({ items, productName, lang, onOpenLightbox }: Props) {
  const colors = useMemo(() => {
    const seen: string[] = [];
    for (const item of items) {
      if (item.color && !seen.includes(item.color)) seen.push(item.color);
    }
    return seen;
  }, [items]);

  const [color, setColor] = useState<string>("");
  const [index, setIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Untagged images belong to every colour, so a shop can mix generic shots with
  // colour-specific ones without duplicating uploads.
  const visible = useMemo(() => {
    if (!color) return items;
    return items.filter((item) => !item.color || item.color === color);
  }, [items, color]);

  useEffect(() => {
    setIndex(0);
  }, [color]);

  const active = visible[Math.min(index, visible.length - 1)];

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduceMotion.current || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 10 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  // Horizontal swipe on the thumbnail track is native scrolling; the main stage
  // gets its own lightweight swipe so the image itself feels draggable.
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 40) return;
    setIndex((i) => {
      const next = dx < 0 ? i + 1 : i - 1;
      return Math.max(0, Math.min(visible.length - 1, next));
    });
  };

  useEffect(() => {
    // Keep the active thumbnail in view as the main image changes.
    const track = trackRef.current;
    if (!track) return;
    const thumb = track.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion.current ? "auto" : "smooth" });
  }, [index]);

  if (!items.length) return null;

  const label = {
    colorLabel: lang === "bn" ? "কালার বাছুন" : "Choose colour",
    counter: lang === "bn" ? `${index + 1} / ${visible.length}` : `${index + 1} / ${visible.length}`,
    zoom: lang === "bn" ? "বড় করে দেখুন" : "Tap to zoom"
  };

  return (
    <div className="gallery3d">
      <div
        ref={stageRef}
        className="gallery3d-stage"
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="gallery3d-figure"
          style={{ transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
          onClick={() => active && onOpenLightbox?.(active.url)}
          aria-label={label.zoom}
        >
          {active ? (
            <Image
              src={active.url}
              alt={active.caption || productName}
              width={1000}
              height={1000}
              className="gallery3d-img"
              priority={index === 0}
              sizes="(max-width: 768px) 92vw, 520px"
            />
          ) : null}
          <span className="gallery3d-sheen" aria-hidden="true" />
        </button>
        <span className="gallery3d-counter">{label.counter}</span>
      </div>

      {colors.length > 1 ? (
        <div className="gallery3d-colors" role="group" aria-label={label.colorLabel}>
          <button
            type="button"
            className={`gallery3d-chip ${color === "" ? "is-active" : ""}`}
            onClick={() => setColor("")}
          >
            {lang === "bn" ? "সব" : "All"}
          </button>
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              className={`gallery3d-chip ${color === c ? "is-active" : ""}`}
              onClick={() => setColor(c)}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="gallery3d-thumbs" ref={trackRef}>
        {visible.map((item, i) => (
          <button
            key={`${item.url}-${i}`}
            type="button"
            className={`gallery3d-thumb ${i === index ? "is-active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`${productName} ${i + 1}`}
            aria-current={i === index}
          >
            <Image src={item.url} alt="" width={120} height={120} className="gallery3d-thumb-img" sizes="72px" />
          </button>
        ))}
      </div>

      {active?.caption ? <p className="gallery3d-caption">{active.caption}</p> : null}
    </div>
  );
}
