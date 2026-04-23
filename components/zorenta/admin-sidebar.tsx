"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { setAdminPrefersMainAppSession } from "@/lib/samenconnect/admin-main-app-nav";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Star,
  MessageSquare,
  CreditCard,
  LogOut,
  Heart,
  Shield,
  Activity,
  Lock,
} from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overzicht", icon: LayoutDashboard },
  { href: "/admin/users", label: "Gebruikers", icon: Users },
  { href: "/admin/jobs", label: "Opdrachten", icon: Briefcase },
  { href: "/admin/applications", label: "Sollicitaties", icon: FileText },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/conversations", label: "Gesprekken", icon: MessageSquare },
  { href: "/admin/billing", label: "Facturatie", icon: CreditCard },
  { href: "/admin/growth", label: "Growth", icon: Activity },
  { href: "/settings/security", label: "Wachtwoord", icon: Lock },
] as const;

type AdminSidebarProps = {
  onNavigate?: () => void;
  onLogout?: () => void;
};

export function AdminSidebar({ onNavigate, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-5">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <span className="font-semibold text-slate-900">SamenConnect Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-100 text-slate-900"
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
        <Link
          href="/dashboard"
          onClick={() => setAdminPrefersMainAppSession()}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <Heart className="h-4 w-4 shrink-0" />
          Naar SamenConnect
        </Link>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Uitloggen
          </button>
        )}
      </div>
    </aside>
  );
}
