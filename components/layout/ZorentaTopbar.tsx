"use client";

import Link from "next/link";
import { Bell, Menu, LogOut } from "lucide-react";

type ZorentaTopbarProps = {
  userDisplayName?: string | null;
  unreadNotifications?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
};

export function ZorentaTopbar({
  userDisplayName,
  unreadNotifications = 0,
  onMenuClick,
  onLogout,
}: ZorentaTopbarProps) {
  const initials = userDisplayName
    ? userDisplayName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link
          href="/zorenta/dashboard"
          className="hidden font-semibold text-slate-900 md:block"
        >
          Zorenta
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <Link
          href="/zorenta/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700"
          aria-label="Profiel"
        >
          {initials}
        </Link>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Uitloggen"
          >
            <LogOut className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Uitloggen</span>
          </button>
        )}
      </div>
    </header>
  );
}
