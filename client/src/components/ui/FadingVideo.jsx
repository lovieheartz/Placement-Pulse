import React, { useEffect, useRef } from "react";

/**
 * Looping background video with a JS (rAF) crossfade — no CSS transitions.
 * Manually loops via `ended` and fades out just before the loop point so the
 * restart is seamless. Starts at opacity 0 and resumes a fade from wherever
 * the previous one left off. Degrades gracefully: if the video can't load,
 * nothing is shown and the animated background behind it remains visible.
 */
const FADE_MS = 500;
const FADE_OUT_LEAD = 0.55; // seconds before end to start fading out

const FadingVideo = ({ src, className = "", style }) => {
  const videoRef = useRef(null);
  const rafRef = useRef(0);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fadeTo = (target, duration = FADE_MS) => {
      cancelAnimationFrame(rafRef.current);
      const start = parseFloat(video.style.opacity || "0");
      const delta = target - start;
      if (duration <= 0) {
        video.style.opacity = String(target);
        return;
      }
      let startTime = null;
      const step = (ts) => {
        if (startTime === null) startTime = ts;
        const p = Math.min((ts - startTime) / duration, 1);
        video.style.opacity = String(start + delta * p);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const onLoadedData = () => {
      video.style.opacity = "0";
      const playPromise = video.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      fadeTo(1);
    };

    const onTimeUpdate = () => {
      const { duration, currentTime } = video;
      if (!duration || Number.isNaN(duration)) return;
      const remaining = duration - currentTime;
      if (!fadingOutRef.current && remaining <= FADE_OUT_LEAD && remaining > 0) {
        fadingOutRef.current = true;
        fadeTo(0);
      }
    };

    const onEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
        fadingOutRef.current = false;
        fadeTo(1);
      }, 100);
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ opacity: 0, ...style }}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
    />
  );
};

export default FadingVideo;
