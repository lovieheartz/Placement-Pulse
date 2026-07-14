import React, { useState } from 'react';

/**
 * Alex, the AI interviewer.
 *
 * DiceBear renders a consistent character from a seed, so Alex looks the same
 * in every interview. It's a plain <img> — if the CDN is unreachable we fall
 * back to a local gradient face rather than showing a broken image in the
 * middle of someone's interview.
 *
 * Three states, so a candidate always knows whose turn it is:
 *   speaking  — concentric rings pulse outward, mouth-level bars bounce
 *   listening — a green halo that breathes with the candidate's own mic level
 *   thinking  — a slow shimmer
 */

const DICEBEAR = 'https://api.dicebear.com/9.x/personas/svg';
const SEED = 'Alex-Interviewer';
const AVATAR_URL =
  `${DICEBEAR}?seed=${SEED}&backgroundColor=6366f1,4f46e5&backgroundType=gradientLinear&radius=50`;

export default function InterviewerAvatar({ speaking, listening, thinking, level = 0 }) {
  const [failed, setFailed] = useState(false);

  // Damped so a loud room doesn't make the halo strobe.
  const halo = listening ? 0.85 + Math.min(1, level * 2.2) * 0.35 : 0.7;

  return (
    <div className="relative flex items-center justify-center">
      {/* Listening halo — breathes with the candidate's voice */}
      <span
        className="pointer-events-none absolute size-56 rounded-full bg-emerald-400/25 blur-3xl transition-all duration-100 sm:size-72"
        style={{ transform: `scale(${halo})`, opacity: listening ? 0.9 : 0 }}
      />

      {/* Speaking rings */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`pointer-events-none absolute rounded-full border border-indigo-300/40 ${
            speaking ? 'animate-ping' : ''
          }`}
          style={{
            width: `${13 + i * 2.5}rem`,
            height: `${13 + i * 2.5}rem`,
            animationDuration: `${1800 + i * 400}ms`,
            opacity: speaking ? 0.5 - i * 0.13 : 0,
            transition: 'opacity 400ms',
          }}
        />
      ))}

      {/* Thinking shimmer */}
      <span
        className={`pointer-events-none absolute size-52 rounded-full bg-amber-400/20 blur-2xl transition-opacity duration-500 sm:size-60 ${
          thinking ? 'animate-pulse opacity-100' : 'opacity-0'
        }`}
      />

      {/* The face */}
      <div
        className={`relative flex size-44 items-center justify-center overflow-hidden rounded-full shadow-2xl shadow-indigo-950/60 ring-2 transition-all duration-300 sm:size-52 ${
          speaking
            ? 'scale-105 ring-indigo-300/70'
            : listening
              ? 'ring-emerald-400/50'
              : 'ring-white/15'
        }`}
      >
        {failed ? (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-600 text-6xl">
            🧑‍💼
          </div>
        ) : (
          <img
            src={AVATAR_URL}
            alt="Alex, your AI interviewer"
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        )}

        {/* Speaking waveform across the bottom of the face */}
        <div
          className={`absolute inset-x-0 bottom-0 flex h-12 items-end justify-center gap-1 bg-gradient-to-t from-black/55 to-transparent pb-3 transition-opacity duration-200 ${
            speaking ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="w-1 animate-bounce rounded-full bg-white/95"
              style={{
                height: `${6 + ((i * 5) % 14)}px`,
                animationDelay: `${i * 80}ms`,
                animationDuration: '620ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Live dot */}
      <span
        className={`absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full ring-4 ring-[#0a0d1a] transition-colors sm:bottom-3 sm:right-3 ${
          speaking ? 'bg-indigo-400' : listening ? 'bg-emerald-400' : 'bg-slate-500'
        }`}
      >
        <span
          className={`size-2.5 rounded-full bg-white/90 ${speaking || listening ? 'animate-pulse' : ''}`}
        />
      </span>
    </div>
  );
}
