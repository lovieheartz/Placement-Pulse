import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Ascend brand glyph — a minimal, circular glassmorphism emblem: a frosted
 * glass disc with a fine gradient ring, carrying a slim "pulse" line that lifts
 * into an upward arrow ("placements trending up"). Deliberately understated to
 * match the app's dark glass UI (landing nav pill, auth panels, sidebars)
 * rather than a chunky app-icon tile.
 *
 * Brand blue mark, never purple. The static browser-tab icon is a filled
 * circular version in public/favicon.svg (kept solid so it stays legible at
 * 16px, where live backdrop-blur can't render).
 */
export function BrandGlyph({ size = 38, glow = true, className, ...props }) {
  const uid = React.useId().replace(/:/g, '');
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {/* soft blue halo */}
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-16%] rounded-full opacity-40 blur-[11px]"
          style={{ background: 'radial-gradient(circle at 50% 45%, #3a63ff 0%, transparent 68%)' }}
        />
      )}

      {/* frosted glass disc */}
      <span className="liquid-glass relative flex h-full w-full items-center justify-center rounded-full">
        {/* faint blue tint */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(145deg, rgba(138,180,255,0.22) 0%, rgba(58,99,255,0.06) 60%, transparent 100%)' }}
        />
        {/* fine hairline ring */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-white/20" />

        <svg
          viewBox="0 0 64 64"
          width="100%"
          height="100%"
          className="relative"
          role="img"
          aria-label="Ascend"
        >
          <defs>
            <linearGradient id={`mark${uid}`} x1="16" y1="44" x2="48" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#cfe0ff" />
              <stop offset="1" stopColor="#ffffff" />
            </linearGradient>
          </defs>

          {/* slim pulse line lifting into an upward arrow */}
          <g
            fill="none"
            stroke={`url(#mark${uid})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 38 H22 L26 43 L30 24 L35 39 L41 32 L47 24" />
            {/* arrowhead */}
            <path d="M40 23 H48 V31" />
          </g>
        </svg>
      </span>
    </span>
  );
}

export default BrandGlyph;
