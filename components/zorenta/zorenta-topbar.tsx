"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, Menu, Shield } from "lucide-react";

type ZorentaTopbarProps = {
  unreadCount: number;
  onMenuClick?: () => void;
  isAdmin?: boolean;
};

export function ZorentaTopbar({ unreadCount, onMenuClick, isAdmin }: ZorentaTopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <Link href="/dashboard" className="hidden font-semibold text-slate-900 md:block">
          SamenConnect
        </Link>
      </div>
      <div className="flex items-center gap-1.5">
        {isAdmin && (
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className="hidden items-center gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 sm:inline-flex"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin
            </Button>
          </Link>
        )}
        <Link
          href="/notifications"
          className="relative flex items-center justify-center rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Notificaties"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
