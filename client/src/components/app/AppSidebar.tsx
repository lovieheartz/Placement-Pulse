import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  NAV,
  PORTAL_META,
  type NavItem,
  type NavLeaf,
  type Role,
} from "@/config/nav";

type Counts = { tpo: number; faculty: number; notifications: number };

function badgeFor(key: string | undefined, counts: Counts) {
  if (!key) return 0;
  return counts[key as keyof Counts] ?? 0;
}

function isActivePath(pathname: string, to?: string) {
  if (!to) return false;
  if (to === "/home" || to === "/student-dashboard" || to === "/faculty-dashboard" || to === "/hod/dashboard") {
    return pathname === to;
  }
  return pathname === to || pathname.startsWith(to + "/");
}

function LeafRow({
  leaf,
  collapsed,
  counts,
  onNavigate,
}: {
  leaf: NavLeaf;
  collapsed: boolean;
  counts: Counts;
  onNavigate: (to: string) => void;
}) {
  const { pathname } = useLocation();
  const active = isActivePath(pathname, leaf.to);
  const count = badgeFor(leaf.badgeKey, counts);
  const Icon = leaf.icon;

  return (
    <button
      onClick={() => onNavigate(leaf.to)}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md py-2 pl-9 pr-2.5 text-[13px] transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{leaf.title}</span>
      {count > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </button>
  );
}

function ItemRow({
  item,
  collapsed,
  counts,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  counts: Counts;
  onNavigate: (to: string) => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;

  const childActive =
    hasChildren && item.children!.some((c) => isActivePath(pathname, c.to));
  const selfActive = isActivePath(pathname, item.to);
  const active = selfActive || childActive;

  const [open, setOpen] = React.useState<boolean>(childActive);
  React.useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const groupBadge = badgeFor(item.badgeKey, counts);

  const handleClick = () => {
    if (hasChildren) {
      if (collapsed) {
        // In rail mode, jump straight to the first child.
        onNavigate(item.children![0].to);
      } else {
        setOpen((o) => !o);
      }
    } else if (item.to) {
      onNavigate(item.to);
    }
  };

  const row = (
    <button
      onClick={handleClick}
      className={cn(
        "group flex w-full items-center rounded-lg px-2.5 py-2.5 text-sm transition-colors",
        collapsed ? "justify-center" : "justify-between",
        active
          ? "bg-white/12 font-semibold text-white shadow-sm ring-1 ring-white/10"
          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn("flex items-center gap-3 min-w-0", collapsed && "gap-0")}>
        <Icon className="size-[18px] shrink-0" strokeWidth={1.85} />
        {!collapsed && <span className="truncate font-medium">{item.title}</span>}
        {!collapsed && item.isNew && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-950">
            New
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex items-center gap-2">
          {groupBadge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {groupBadge > 9 ? "9+" : groupBadge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight
              className={cn(
                "size-4 text-sidebar-foreground/50 transition-transform duration-200",
                open && "rotate-90"
              )}
              strokeWidth={2}
            />
          )}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex w-full flex-col">
      {collapsed ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        row
      )}

      {hasChildren && !collapsed && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <span className="absolute bottom-1 left-[19px] top-1 w-px bg-white/10" />
            {item.children!.map((leaf) => (
              <LeafRow
                key={leaf.id}
                leaf={leaf}
                collapsed={collapsed}
                counts={counts}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  role,
  collapsed = false,
  counts,
  onNavigate,
  onToggleCollapse,
}: {
  role: Role;
  collapsed?: boolean;
  counts: Counts;
  onNavigate?: (to: string) => void;
  onToggleCollapse?: () => void;
}) {
  const navigate = useNavigate();
  const meta = PORTAL_META[role];
  const BrandIcon = meta.icon;

  const go = (to: string) => {
    if (onNavigate) onNavigate(to);
    navigate(to);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <button
        onClick={() => go(meta.home)}
        className={cn(
          "flex items-center gap-3 px-4 py-4 transition-colors hover:bg-white/5",
          collapsed && "justify-center px-2"
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/95 text-blue-700 shadow-md">
          <BrandIcon className="size-5" strokeWidth={2.2} />
        </span>
        {!collapsed && (
          <span className="flex flex-col text-left leading-tight">
            <span className="text-[15px] font-bold text-white">
              {meta.label}
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">
              NSEC Placement Cell
            </span>
          </span>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV[role].map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {group.heading && !collapsed && (
              <span className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                {group.heading}
              </span>
            )}
            {group.heading && collapsed && (
              <span className="mx-auto mb-1 h-px w-6 bg-white/10" />
            )}
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                collapsed={collapsed}
                counts={counts}
                onNavigate={go}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-white/10 p-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 pb-2 pt-1 text-[11px] text-sidebar-foreground/55">
            <Badge variant="solid" className="bg-white/10 text-white/90">
              Ascend
            </Badge>
            <span>v2.0 · Placement Suite</span>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" strokeWidth={1.85} />
            ) : (
              <>
                <PanelLeftClose className="size-[18px]" strokeWidth={1.85} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
