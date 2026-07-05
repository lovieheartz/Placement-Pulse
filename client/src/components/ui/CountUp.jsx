import React, { useEffect, useState } from "react";
import useInView from "../../hooks/useInView";

/**
 * Animates a numeric value up from zero when it scrolls into view, preserving
 * any surrounding text (e.g. "95%", "12 LPA", "2.8K+", "4.6 LPA"). Falls back
 * to the literal value if it can't parse a number.
 */
const zeroed = (value) =>
  String(value).replace(/[\d.]+/, (n) =>
    (0).toFixed((n.split(".")[1] || "").length)
  );

const CountUp = ({ value, className = "", duration = 1300 }) => {
  const [ref, inView] = useInView();
  const [display, setDisplay] = useState(() => zeroed(value));

  useEffect(() => {
    if (!inView) return;
    const match = String(value).match(/^(\D*)([\d.,]+)(.*)$/);
    if (!match) {
      setDisplay(value);
      return;
    }
    const [, pre, numStr, suffix] = match;
    const clean = numStr.replace(/,/g, "");
    const target = parseFloat(clean);
    if (Number.isNaN(target)) {
      setDisplay(value);
      return;
    }
    const decimals = (clean.split(".")[1] || "").length;

    let raf = 0;
    let start;
    const tick = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${pre}${(target * eased).toFixed(decimals)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
};

export default CountUp;
