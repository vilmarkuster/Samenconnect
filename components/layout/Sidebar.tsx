"use client";

import Link from "next/link";
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
  Heart,
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
};

export function Sidebar({ onNavigate, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/zorenta" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Heart className="h-4 w-4" />
          </span>
          <span className="font-semibold text-slate-900">Zorenta</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {ZORENTA_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/zorenta/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Uitloggen
          </button>
        )}
        <Link
          href="/dashboard"
          className="mt-0.5 flex items-center rounded-lg px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          ← Back to App
        </Link>
      </div>
    </aside>
  );
}
