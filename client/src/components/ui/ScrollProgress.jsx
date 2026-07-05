import React, { useEffect, useRef } from "react";

/**
 * Thin gradient bar fixed to the top of the viewport that tracks scroll
 * progress through the page. Purely presentational, rAF-throttled.
 */
const ScrollProgress = () => {
  const ref = useRef(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      el.style.setProperty("--sp", `${Math.min(100, Math.max(0, pct))}%`);
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

  return <div ref={ref} className="ds-progress" aria-hidden="true" />;
};

export default ScrollProgress;
