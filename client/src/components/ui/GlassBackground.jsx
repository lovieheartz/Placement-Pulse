import React from "react";
import FadingVideo from "./FadingVideo";

/**
 * Full-bleed background layer for the dark glass experience.
 * Animated aurora gradient is always rendered underneath, so the UI still
 * looks premium even if the (external) video fails to load. The video, when
 * available, crossfade-loops on top of it.
 *
 *  - `zoom`   : scale the video to 120% and anchor to the top of frame (hero).
 *  - `overlay`: darkening gradient strength (0 = none) for text contrast.
 */
const GlassBackground = ({ video, zoom = false, overlay = 0.35 }) => (
  <div className="absolute inset-0 z-0 overflow-hidden">
    {/* Animated fallback / base */}
    <div className="absolute inset-0 ds-aurora" />

    {/* Crossfading video */}
    {video && (
      <FadingVideo
        src={video}
        className={
          zoom
            ? "absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top"
            : "absolute inset-0 w-full h-full object-cover"
        }
        style={zoom ? { width: "120%", height: "120%" } : undefined}
      />
    )}

    {/* Contrast overlay */}
    {overlay > 0 && (
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(5,6,10,${overlay * 0.6}) 0%, rgba(5,6,10,${overlay * 0.2}) 40%, rgba(5,6,10,${overlay}) 100%)`,
        }}
      />
    )}
  </div>
);

export default GlassBackground;
