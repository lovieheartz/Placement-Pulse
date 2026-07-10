import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { PORTAL_META, type Role } from "@/config/nav";
import { AppSidebar } from "@/components/app/AppSidebar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const RAIL_KEY = "ascend.sidebar.collapsed";

function resolveAvatar(user: any): string | null {
  const path = user?.profilePicture || user?.avatar;
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function initials(user: any): string {
  const src = user?.name || user?.email || "U";
  return src.trim().charAt(0).toUpperCase();
}

const NOTIF_ROUTE: Record<Role, string | null> = {
  student: "/student/notifications",
  hod: "/hod/notification-history",
  admin: "/admin/notification-history",
  faculty: null,
};

function NotificationBell({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = React.useState(false);
  const viewAllRoute = NOTIF_ROUTE[role];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-9 items-center justify-center rounded-full text-sidebar-foreground/75 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="size-[18px]" strokeWidth={1.9} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-sidebar">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  You&apos;re all caught up 🎉
                </div>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <button
                    key={n._id}
                    onClick={() => markRead(n._id)}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      !n.isReadByUser && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium text-foreground">
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {n.content || n.description}
                    </span>
                    <span
                      className={cn(
                        "mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-medium",
                        n.createdByModel === "Admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      {n.createdByModel === "Admin" ? "TPO" : "Faculty"}
                    </span>
                  </button>
                ))
              )}
            </div>
            {viewAllRoute && (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(viewAllRoute);
                }}
                className="w-full border-t border-border py-2.5 text-center text-xs font-medium text-primary hover:bg-accent/50"
              >
                View all notifications
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export type PortalLayoutProps = {
  role: Role;
  title: string;
  description?: string;
  user?: any;
  actions?: React.ReactNode;
  showNotifications?: boolean;
  children: React.ReactNode;
};

export function PortalLayout({
  role,
  title,
  description,
  user: userProp,
  actions,
  showNotifications = true,
  children,
}: PortalLayoutProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const user = userProp || auth?.user || {};
  const meta = PORTAL_META[role];

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return sessionStorage.getItem(RAIL_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { tpoUnread, facultyUnread, unreadCount } = useNotifications();
  const counts = {
    tpo: tpoUnread,
    faculty: facultyUnread,
    notifications: unreadCount,
  };

  const toggleRail = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        sessionStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = () => {
    auth?.logout?.();
    navigate("/login", { replace: true });
  };

  const avatarUrl = resolveAvatar(user);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-in-out md:block",
          collapsed ? "w-[68px]" : "w-[232px]"
        )}
      >
        <AppSidebar
          role={role}
          collapsed={collapsed}
          counts={counts}
          onToggleCollapse={toggleRail}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <AppSidebar
            role={role}
            counts={counts}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — matches the sidebar's deep navy for one cohesive app frame */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border/60 bg-sidebar px-3 font-sans text-sidebar-foreground shadow-[0_10px_30px_-20px_rgba(2,6,23,0.9)] sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/75 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <button
              onClick={toggleRail}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden size-9 items-center justify-center rounded-lg text-sidebar-foreground/75 transition-colors hover:bg-white/10 hover:text-white md:flex"
              aria-label="Toggle sidebar"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.8} />
              ) : (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.8} />
              )}
            </button>

            <div className="min-w-0 border-l border-white/15 pl-3">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-sidebar-foreground/60">
                <span className="hidden sm:inline">{meta.label}</span>
                <ChevronRight className="hidden size-3 sm:inline" />
                <span className="truncate font-semibold text-blue-300">{title}</span>
              </div>
              <h1 className="truncate text-base font-bold leading-tight tracking-tight text-white sm:text-lg">
                {title}
              </h1>
            </div>
          </div>

          {/* Global search pill */}
          <button
            onClick={() => setSearchOpen(true)}
            className="group mx-2 hidden h-9 max-w-xs flex-1 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 text-sm text-sidebar-foreground/70 transition-colors hover:border-white/25 hover:bg-white/15 hover:text-white lg:flex"
          >
            <Search className="size-4 shrink-0 transition-colors group-hover:text-white" strokeWidth={1.9} />
            <span className="truncate">Search pages…</span>
            <kbd className="ml-auto flex items-center gap-0.5 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/80">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {actions}

            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-sidebar-foreground/75 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Search"
            >
              <Search className="size-[18px]" strokeWidth={1.9} />
            </button>

            {showNotifications && <NotificationBell role={role} />}

            <span className="hidden h-8 w-px bg-white/15 sm:block" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-1 transition-colors hover:border-white/20 hover:bg-white/10 sm:pr-2.5">
                  <Avatar className="size-8 ring-1 ring-white/20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback>{initials(user)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[9rem] flex-col items-start leading-tight sm:flex">
                    <span className="truncate text-[13px] font-semibold text-white">
                      {user?.name || user?.email || "User"}
                    </span>
                    <span className="truncate text-[11px] capitalize text-sidebar-foreground/60">
                      {role}
                    </span>
                  </span>
                  <ChevronDown className="hidden size-4 text-sidebar-foreground/60 sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm">{user?.name || "User"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle2 className="size-4" />
                  Profile View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="relative flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40 dark:from-background dark:via-background dark:to-background">
          {/* decorative glass backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-28 left-1/4 size-80 rounded-full bg-blue-400/15 blur-3xl dark:bg-blue-500/10" />
            <div className="absolute top-32 right-0 size-80 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10" />
            <div className="absolute bottom-0 left-0 size-72 rounded-full bg-violet-400/10 blur-3xl" />
          </div>
          <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {description && (
              <p className="mb-6 -mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {children}
          </div>
        </main>
      </div>

      <CommandPalette role={role} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export default PortalLayout;
