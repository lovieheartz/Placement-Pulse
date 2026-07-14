import React, { useEffect, useRef } from "react";

/**
 * Scroll-driven parallax layer. Children translate vertically as the element
 * moves through the viewport, at a rate set by `speed` (px of travel across a
 * full viewport pass; positive = drifts down/slower than the page, negative =
 * drifts up/faster). Purely decorative depth — rAF-throttled, transform-only,
 * and disabled for prefers-reduced-motion.
 */
const Parallax = ({ children, speed = 40, className = "", as: Tag = "div" }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      // -1 (below viewport) .. 0 (centred) .. 1 (above viewport)
      const p = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      // one-sided: full depth while entering, damped when leaving (keeps headers clear of the nav)
      const q = p > 0 ? p : p * 0.35;
      el.style.transform = `translate3d(0, ${(q * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return (
    <Tag ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </Tag>
  );
};

/**
 * Zero-markup variant: drop `<Drift speed={n} />` inside any element and that
 * element gains the same scroll parallax, without re-nesting its JSX.
 */
export const Drift = ({ speed = 30 }) => {
  const probe = useRef(null);

  useEffect(() => {
    const el = probe.current ? probe.current.parentElement : null;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    el.classList.add("will-change-transform");
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const p = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      // one-sided: full depth while entering, damped when leaving (keeps headers clear of the nav)
      const q = p > 0 ? p : p * 0.35;
      el.style.transform = `translate3d(0, ${(q * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [speed]);

  return <span ref={probe} aria-hidden className="hidden" />;
};

export default Parallax;
