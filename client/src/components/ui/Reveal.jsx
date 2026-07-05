import React from "react";
import useInView from "../../hooks/useInView";

/**
 * Scroll-triggered entrance (blur + fade + rise). Pass `delay` in seconds.
 * `immediate` reveals on mount (for above-the-fold hero content).
 * Uses a fail-safe in-view hook so content is never left invisible.
 */
const Reveal = ({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  immediate = false,
}) => {
  const [ref, inView] = useInView();
  const shown = immediate || inView;

  return (
    <Tag
      ref={ref}
      className={`${shown ? "ds-reveal" : ""} ${className}`}
      style={shown ? { animationDelay: `${delay}s` } : { opacity: 0 }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
