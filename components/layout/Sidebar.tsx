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
} from "lucide-react";

export const ZORENTA_NAV_ITEMS = [
  { href: "/zorenta/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/zorenta/jobs", label: "Vacatures", icon: Briefcase },
  { href: "/zorenta/intake", label: "Zorgvraag intake", icon: ClipboardList },
  { href: "/zorenta/applications", label: "Sollicitaties", icon: FileText },
  { href: "/zorenta/messages", label: "Berichten", icon: MessageSquare },
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
    <div className="flex h-full flex-col">
      <div className="px-4 pt-3">
        <div className="rounded-md bg-pink-600 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
          SIDEBAR
        </div>
      </div>
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="text-lg font-semibold text-slate-900">SamenConnect</div>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Uitloggen
          </button>
        )}
        <a
          href="/dashboard"
          className="mt-2 flex items-center rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          ← Terug naar AI App
        </a>
      </div>
    </div>
  );
}
