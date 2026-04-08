"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  Star,
  Bell,
  Search,
  User,
  LogOut,
  Heart,
  Bookmark,
  ClipboardList,
  CreditCard,
  Shield,
} from "lucide-react";

const baseNavItems = [
  { href: "/zorenta/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/zorenta/jobs", label: "Opdrachten", icon: Briefcase },
  { href: "/zorenta/favorites", label: "Favorieten", icon: Heart },
  { href: "/zorenta/opgeslagen", label: "Opgeslagen", icon: Bookmark },
  { href: "/zorenta/intake", label: "Zorgvraag intake", icon: ClipboardList },
  { href: "/zorenta/applications", label: "Matches", icon: FileText },
  { href: "/zorenta/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/zorenta/reviews", label: "Reviews", icon: Star },
  { href: "/zorenta/notifications", label: "Notificaties", icon: Bell },
  { href: "/zorenta/search", label: "Zoeken / Zorgverleners", icon: Search },
  { href: "/zorenta/profile", label: "Mijn profiel", icon: User },
  { href: "/zorenta/settings/billing", label: "Facturatie", icon: CreditCard },
];

type ZorentaSidebarProps = {
  onNavigate?: () => void;
  isAdmin?: boolean;
};

export function ZorentaSidebar({ onNavigate, isAdmin }: ZorentaSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const navItems = isAdmin
    ? [...baseNavItems, { href: "/zorenta/admin", label: "Admin", icon: Shield }]
    : baseNavItems;

  async function handleLogout() {
    await logout();
    router.push("/zorenta/login");
  }

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200/80 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200/80 px-5">
        <Link href="/zorenta" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <Heart className="h-4 w-4" />
          </span>
          <span className="font-semibold text-slate-900">SamenConnect</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
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
      <div className="border-t border-slate-200/80 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Uitloggen
        </button>
        <Link
          href="/dashboard"
          className="mt-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        >
          ← Terug naar SamenConnect
        </Link>
      </div>
    </aside>
  );
}
