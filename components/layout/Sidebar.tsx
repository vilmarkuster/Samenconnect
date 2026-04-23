"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  FileText,
  MessageSquare,
  Star,
  Bell,
  Search,
  User,
  LogOut,
  Shield,
  Heart,
  Bookmark,
  Lock,
  Sparkles,
} from "lucide-react";

export const ZORENTA_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Opdrachten", icon: Briefcase },
  {
    href: "/jobs?source=ai-finder",
    label: "AI opdrachten zoeken",
    icon: Sparkles,
    roles: ["caregiver"] as const,
  },
  {
    href: "/matches?source=ai-finder",
    label: "AI zorgverleners zoeken",
    icon: Sparkles,
    roles: ["client", "organization"] as const,
  },
  { href: "/intake", label: "Zorgvraag intake", icon: ClipboardList, roles: ["client", "organization"] as const },
  { href: "/applications", label: "Sollicitaties", icon: FileText },
  { href: "/favorites", label: "Favorieten", icon: Heart },
  { href: "/opgeslagen", label: "Opgeslagen", icon: Bookmark, roles: ["client", "organization"] as const },
  { href: "/matches", label: "Zoek zorgverleners", icon: Search, roles: ["client", "organization"] as const },
  { href: "/search", label: "Zoeken (filters)", icon: Search, roles: ["caregiver"] as const },
  { href: "/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/notifications", label: "Notificaties", icon: Bell },
  { href: "/profile", label: "Mijn profiel", icon: User },
  { href: "/settings/security", label: "Wachtwoord", icon: Lock },
] as const;

type SidebarProps = {
  onNavigate?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  /** When set, filters client-only vs caregiver-only items. Ignored until userRoleReady is true. */
  userRole?: string | null;
  /** Must be true before role-gated links render, so caregivers never briefly see client-only items. */
  userRoleReady?: boolean;
};

/** Max nav rows (demand-side + admin has the longest menu) — skeleton + post-load padding share this count. */
const SIDEBAR_NAV_SLOT_COUNT = 14;

function SidebarNavSkeleton() {
  return (
    <>
      {Array.from({ length: SIDEBAR_NAV_SLOT_COUNT }).map((_, i) => (
        <div
          key={`nav-skel-${i}`}
          className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3"
          aria-hidden
        >
          <span className="h-4 w-4 shrink-0 rounded bg-white/10" />
          <span
            className="h-3.5 max-w-[11rem] flex-1 rounded bg-white/10"
            style={{ width: `${68 + (i % 5) * 12}px` }}
          />
        </div>
      ))}
    </>
  );
}

function navItemIsActive(pathname: string | null, itemHref: string, searchParams: URLSearchParams | null): boolean {
  if (!pathname) return false;
  if (itemHref.includes("?")) {
    const [path, query] = itemHref.split("?");
    if (pathname !== path) return false;
    const want = new URLSearchParams(query);
    if (!searchParams) return false;
    for (const [k, v] of want.entries()) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  }
  if (pathname === itemHref) return true;
  if (itemHref !== "/dashboard" && pathname.startsWith(itemHref)) return true;
  return false;
}

export function Sidebar({ onNavigate, onLogout, isAdmin, userRole, userRoleReady = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const baseItems = ZORENTA_NAV_ITEMS.filter((item) => {
    if (!("roles" in item) || !item.roles) return true;
    if (!userRoleReady) return false;
    return (item.roles as readonly string[]).includes(userRole ?? "");
  }).map(({ href, label, icon }) => ({ href, label, icon }));

  const navItems = isAdmin
    ? [...baseItems, { href: "/admin", label: "Admin", icon: Shield }]
    : baseItems;

  return (
    <div className="flex h-full flex-col bg-[#0f766e] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="select-none">
          <div className="text-xs uppercase tracking-[0.22em] text-white/60">SamenConnect</div>
          <div className="mt-1 truncate text-xl font-semibold leading-tight">Care Workspace</div>
        </div>
      </div>
      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"
        aria-busy={!userRoleReady}
        aria-label="Hoofdmenu"
      >
        {!userRoleReady ? (
          <>
            <span className="sr-only">Menu laden…</span>
            <SidebarNavSkeleton />
          </>
        ) : (
          <>
            {navItems.map((item) => {
              const active = navItemIsActive(pathname ?? null, item.href, searchParams);
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </a>
              );
            })}
            {Array.from({ length: Math.max(0, SIDEBAR_NAV_SLOT_COUNT - navItems.length) }).map((_, i) => (
              <div
                key={`nav-pad-${i}`}
                className="invisible pointer-events-none flex select-none items-center gap-3 rounded-2xl px-3 py-3 text-sm"
                aria-hidden
              >
                <span className="h-4 w-4 shrink-0" />
                <span className="h-4 w-24 shrink-0" />
              </div>
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Uitloggen
          </button>
        )}
      </div>
    </div>
  );
}
