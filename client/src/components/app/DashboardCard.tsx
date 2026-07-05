import * as React from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES: Record<
  string,
  { icon: string; glow: string; ring: string }
> = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    glow: "from-blue-500/10",
    ring: "group-hover:ring-blue-500/30",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600",
    glow: "from-violet-500/10",
    ring: "group-hover:ring-violet-500/30",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    glow: "from-emerald-500/10",
    ring: "group-hover:ring-emerald-500/30",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
    glow: "from-amber-500/10",
    ring: "group-hover:ring-amber-500/30",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-600",
    glow: "from-rose-500/10",
    ring: "group-hover:ring-rose-500/30",
  },
  indigo: {
    icon: "bg-indigo-500/10 text-indigo-600",
    glow: "from-indigo-500/10",
    ring: "group-hover:ring-indigo-500/30",
  },
};

export type DashboardCardProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  badge?: string;
  onClick?: () => void;
};

export function DashboardCard({
  title,
  description,
  icon: Icon,
  tone = "blue",
  badge,
  onClick,
}: DashboardCardProps) {
  const t = TONES[tone] ?? TONES.blue;
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1",
        // glassmorphism
        "border border-white/60 bg-white/55 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-xl ring-1 ring-transparent",
        "hover:bg-white/70 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35)]",
        "dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
        t.ring
      )}
    >
      {/* top sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
      {/* colored glow on hover */}
      <span
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          t.glow
        )}
      />

      <div className="mb-3 flex items-start justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3",
            t.icon
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <span className="flex items-center gap-1.5">
          {badge && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-950 shadow-sm">
              {badge}
            </span>
          )}
          <ArrowUpRight className="size-4 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </span>
      </div>

      <h3 className="text-[15px] font-semibold leading-snug text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </button>
  );
}

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
}: StatCardProps) {
  const t = TONES[tone] ?? TONES.blue;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/55 p-4 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5",
          t.icon
        )}
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-foreground">
          {value}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
      </div>
    </div>
  );
}
