import React, { useEffect, useRef } from "react";

/**
 * Blurred colour orbs that drift on scroll (parallax) behind a section.
 * They give the frosted-glass cards something to blur, so the glassmorphism
 * actually reads on otherwise-flat dark sections. Purely decorative.
 */
const ParallaxOrbs = ({ variant = 2, className = "" }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      // -1 (below viewport) .. 1 (above viewport)
      const p = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      el.style.setProperty("--p", p.toFixed(3));
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
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <span className="ds-orb ds-orb-1" />
      <span className="ds-orb ds-orb-2" />
      {variant >= 3 && <span className="ds-orb ds-orb-3" />}
    </div>
  );
};

export default ParallaxOrbs;
