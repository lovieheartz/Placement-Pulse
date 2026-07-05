import React, { useRef } from "react";

/**
 * Liquid-glass surface. `strong` uses the heavier-blur variant (CTAs/panels).
 * `hover` adds the lift + glow. `tilt` adds an interactive 3D mouse-tilt.
 * `as` lets it render as a button/link/section while keeping the styling.
 */
const LiquidGlass = ({
  children,
  strong = false,
  hover = false,
  tilt = false,
  className = "",
  as: Tag = "div",
  ...props
}) => {
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = "transform 0.08s ease-out";
    el.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(
      2
    )}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-6px)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "";
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={tilt ? handleMove : undefined}
      onMouseLeave={tilt ? handleLeave : undefined}
      className={`${strong ? "liquid-glass-strong" : "liquid-glass"} ${
        hover ? "glass-hover" : ""
      } ${className}`}
      style={tilt ? { transformStyle: "preserve-3d" } : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default LiquidGlass;
