import React from "react";
import useInView from "../../hooks/useInView";

/**
 * Word-by-word blur-in reveal, triggered when the element scrolls into view.
 * CSS does the animation (see design-system.css .ds-blurtext / .ds-word);
 * a fail-safe in-view hook guarantees the words always end up visible.
 */
const BlurText = ({ text, className = "", center = false, as: Tag = "p" }) => {
  const [ref, inView] = useInView();
  const words = text.split(" ");

  return (
    <Tag
      ref={ref}
      className={`ds-blurtext ${center ? "ds-center" : ""} ${
        inView ? "is-visible" : ""
      } ${className}`}
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="ds-word" style={{ "--i": i }}>
          {word}
        </span>
      ))}
    </Tag>
  );
};

export default BlurText;
