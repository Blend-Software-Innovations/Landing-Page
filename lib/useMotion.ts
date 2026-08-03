import { useEffect, useRef, useState } from "react";

// Motion primitives shared by the storefront. All of them degrade to a static,
// fully-visible layout when JS is unavailable or the user asked for reduced
// motion — content must never depend on an animation having run.

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Marks the document so CSS can distinguish a hydrated client from SSR/no-JS.
 * The `.reveal` rules only hide content under `.js`, so a failed hydration
 * leaves everything visible rather than blank.
 */
export function useJsFlag() {
  useEffect(() => {
    document.documentElement.classList.add("js");
  }, []);
}

/**
 * Reveals elements on scroll via IntersectionObserver — one observer for the
 * whole page rather than a listener per element. Re-scans when `deps` change so
 * conditionally rendered sections still animate in.
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Pointer-driven 3D tilt. Skipped entirely on touch devices — there is no hover
 * there, and running it would just cost battery on the phones most visitors use.
 */
export function useTilt<T extends HTMLElement>(maxDeg = 6) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) return;
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.style.setProperty("--tilt-y", `${(px * maxDeg * 2).toFixed(2)}deg`);
        node.style.setProperty("--tilt-x", `${(-py * maxDeg * 2).toFixed(2)}deg`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      node.style.setProperty("--tilt-y", "0deg");
      node.style.setProperty("--tilt-x", "0deg");
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [maxDeg]);

  return ref;
}

/**
 * True once the element has been scrolled past — used to show the sticky buy
 * bar only after the visitor has seen the hero price.
 */
export function useScrolledPast(targetId: string) {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return passed;
}
