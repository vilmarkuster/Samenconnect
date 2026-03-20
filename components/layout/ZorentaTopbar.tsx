"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Menu, Shield } from "lucide-react";
import { GlobalSearchAutocomplete } from "@/components/zorenta/global-search-autocomplete";

type ZorentaTopbarProps = {
  userDisplayName?: string | null;
  unreadNotifications?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
};

export function ZorentaTopbar({
  userDisplayName,
  unreadNotifications = 0,
  onMenuClick,
  onLogout,
  isAdmin,
}: ZorentaTopbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialQuery = searchParams?.get("q") ?? "";
  const initials = userDisplayName
    ? userDisplayName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex h-full w-full items-center justify-between gap-4 px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">SamenConnect</p>
          <p className="truncate text-lg font-semibold text-slate-900">Dashboard</p>
        </div>
      </div>
      <div className="hidden flex-1 px-4 md:block">
        <GlobalSearchAutocomplete
          value={initialQuery}
          placeholder="Zoek opdrachten, locatie, zorgtype..."
          onValueChange={(val) => {
            // Only update results live when you're already on the matches page.
            if (pathname === "/zorenta/matches") {
              const trimmed = val.trim();
              if (!trimmed) {
                router.push("/zorenta/matches");
              } else {
                router.push(`/zorenta/matches?q=${encodeURIComponent(trimmed)}`);
              }
            }
          }}
          onSubmit={(val) => {
            const trimmed = val.trim();
            if (!trimmed) router.push("/zorenta/matches");
            else router.push(`/zorenta/matches?q=${encodeURIComponent(trimmed)}`);
          }}
          onSelectLocation={(location) => {
            router.push(`/zorenta/matches?q=${encodeURIComponent(location)}`);
          }}
          onSelectCareType={(careType) => {
            router.push(`/zorenta/matches?q=${encodeURIComponent(careType)}`);
          }}
          onSelectCaregiver={(caregiverId) => {
            router.push(`/zorenta/profielen/${caregiverId}`);
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            href="/zorenta/admin"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-[#40ADA8]/30 hover:text-[#40ADA8]"
          >
            <Shield className="inline h-3.5 w-3.5" /> Admin
          </Link>
        )}
        <Link
          href="/zorenta/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-[#40ADA8]/30 hover:text-[#40ADA8]"
          aria-label="Notificaties"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-medium text-white">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </Link>
        <Link
          href="/zorenta/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-[#40ADA8] text-sm font-semibold text-white shadow-sm"
          aria-label="Profiel"
        >
          {initials}
        </Link>
        <Link href="/zorenta/zorgvraag-nieuw">
          <button className="ml-1 hidden h-11 rounded-2xl bg-[#40ADA8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#369590] md:inline-flex">
            + Plaats opdracht
          </button>
        </Link>
      </div>
    </div>
  );
}
