import { useEffect, useRef, useState } from "react";

/**
 * Robust "is this element in view yet" hook for scroll reveals.
 * Guarantees the element is eventually revealed even if IntersectionObserver
 * misbehaves (StrictMode double-mount, unsupported, etc.) via a safety timeout,
 * so content can never get stuck invisible.
 */
export default function useInView({
  threshold = 0,
  rootMargin = "0px 0px -8% 0px",
  fallbackMs = 1400,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    let settled = false;
    const reveal = () => {
      if (!settled) {
        settled = true;
        setInView(true);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal();
            io.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );
    io.observe(el);

    // Safety net: never leave content hidden.
    const timer = setTimeout(reveal, fallbackMs);

    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [threshold, rootMargin, fallbackMs]);

  return [ref, inView];
}
