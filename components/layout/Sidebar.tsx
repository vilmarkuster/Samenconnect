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
} from "lucide-react";

export const ZORENTA_NAV_ITEMS = [
  { href: "/zorenta/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/zorenta/jobs", label: "Vacatures", icon: Briefcase },
  { href: "/zorenta/intake", label: "Zorgvraag intake", icon: ClipboardList },
  { href: "/zorenta/applications", label: "Sollicitaties", icon: FileText },
  { href: "/zorenta/favorites", label: "Favorieten", icon: Heart },
  { href: "/zorenta/opgeslagen", label: "Opgeslagen", icon: Bookmark },
  { href: "/zorenta/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/zorenta/reviews", label: "Reviews", icon: Star },
  { href: "/zorenta/notifications", label: "Notificaties", icon: Bell },
  { href: "/zorenta/search", label: "Zorgverleners zoeken", icon: Search },
  { href: "/zorenta/profile", label: "Mijn profiel", icon: User },
] as const;

type SidebarProps = {
  onNavigate?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
};

export function Sidebar({ onNavigate, onLogout, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const navItems = isAdmin
    ? [...ZORENTA_NAV_ITEMS, { href: "/zorenta/admin", label: "Admin", icon: Shield }]
    : ZORENTA_NAV_ITEMS;

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
            (item.href !== "/zorenta/dashboard" && pathname?.startsWith(item.href));
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
        <a
          href="/chat"
          className="mt-2 flex items-center rounded-2xl px-3 py-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        >
          ← Terug naar AI App
        </a>
      </div>
    </div>
  );
}
