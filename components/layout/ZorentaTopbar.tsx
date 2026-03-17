"use client";

import Link from "next/link";
import { Bell, Menu, Shield } from "lucide-react";

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
  const initials = userDisplayName
    ? userDisplayName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex h-full w-full items-center justify-between px-4 md:px-6">
      <div className="mr-4 rounded-md bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black shadow">
        TOPBAR
      </div>
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
        <span className="text-lg font-semibold text-slate-900">SamenConnect</span>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            href="/zorenta/admin"
            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            <Shield className="inline h-3.5 w-3.5" /> Admin
          </Link>
        )}
        <Link
          href="/zorenta/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
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
      </div>
    </div>
  );
}
