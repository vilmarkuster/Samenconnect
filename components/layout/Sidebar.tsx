"use client";

import { usePathname } from "next/navigation";
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
} from "lucide-react";

export const ZORENTA_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Vacatures", icon: Briefcase },
  { href: "/intake", label: "Zorgvraag intake", icon: ClipboardList, roles: ["client", "organization"] as const },
  { href: "/applications", label: "Sollicitaties", icon: FileText },
  { href: "/favorites", label: "Favorieten", icon: Heart },
  { href: "/opgeslagen", label: "Opgeslagen", icon: Bookmark, roles: ["client", "organization"] as const },
  { href: "/matches", label: "Zoek zorgverleners", icon: Search, roles: ["client", "organization"] as const },
  { href: "/search", label: "Zoeken", icon: Search, roles: ["caregiver"] as const },
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

export function Sidebar({ onNavigate, onLogout, isAdmin, userRole, userRoleReady = false }: SidebarProps) {
  const pathname = usePathname();
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
        <div className="text-xs uppercase tracking-[0.22em] text-white/60">SamenConnect</div>
        <div className="mt-1 text-xl font-semibold">Care Workspace</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
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
