"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Menu, Shield, Sparkles } from "lucide-react";
import { GlobalSearchAutocomplete } from "@/components/zorenta/global-search-autocomplete";
import { aiFinderListHref } from "@/lib/zorenta/ai-finder-routes";

type ZorentaTopbarProps = {
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  unreadNotifications?: number;
  onMenuClick?: () => void;
  onLogout?: () => void;
  isAdmin?: boolean;
  userRole?: string | null;
  /** When false, do not infer caregiver vs client from a null role (avoids wrong CTAs / search targets). */
  userRoleReady?: boolean;
};

export function ZorentaTopbar({
  userDisplayName,
  userAvatarUrl,
  unreadNotifications = 0,
  onMenuClick,
  onLogout,
  isAdmin,
  userRole,
  userRoleReady = false,
}: ZorentaTopbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialQuery = searchParams?.get("q") ?? "";
  const roleKnown = userRoleReady === true;
  const isCaregiver = roleKnown && userRole === "caregiver";
  const isDemandSide =
    roleKnown && (userRole === "client" || userRole === "organization");
  const searchListPath = !roleKnown
    ? "/search"
    : userRole === "caregiver"
      ? "/jobs"
      : userRole === "client" || userRole === "organization"
        ? "/matches"
        : "/search";
  const aiFinderHref = roleKnown ? aiFinderListHref(userRole) : null;
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
        <Link
          href="/dashboard"
          className="min-w-0 rounded-xl px-1 py-0.5 outline-none ring-offset-2 ring-offset-white transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#40ADA8]/40"
          aria-label="Naar dashboard"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">SamenConnect</p>
          <p className="truncate text-lg font-semibold text-slate-900">Dashboard</p>
        </Link>
      </div>
      <div className="hidden flex-1 px-4 md:block">
        <GlobalSearchAutocomplete
          value={initialQuery}
          placeholder={
            roleKnown
              ? isCaregiver
                ? "Zoek opdrachten, locatie, zorgtype..."
                : "Zoek zorgverleners, locatie, zorgtype..."
              : "Zoeken laden…"
          }
          onValueChange={(val) => {
            if (pathname === searchListPath) {
              const trimmed = val.trim();
              if (!trimmed) {
                router.push(searchListPath);
              } else {
                router.push(`${searchListPath}?q=${encodeURIComponent(trimmed)}`);
              }
            }
          }}
          onSubmit={(val) => {
            const trimmed = val.trim();
            if (!trimmed) router.push(searchListPath);
            else router.push(`${searchListPath}?q=${encodeURIComponent(trimmed)}`);
          }}
          onSelectLocation={(location) => {
            router.push(`${searchListPath}?q=${encodeURIComponent(location)}`);
          }}
          onSelectCareType={(careType) => {
            router.push(`${searchListPath}?q=${encodeURIComponent(careType)}`);
          }}
          onSelectCaregiver={(caregiverId) => {
            router.push(`/profielen/${caregiverId}`);
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        {/* Reserve AI control width while role loads so the right cluster does not shift when it appears */}
        {!roleKnown ? (
          <span
            className="hidden h-10 w-[3.25rem] shrink-0 rounded-2xl border border-transparent sm:inline-block"
            aria-hidden
          />
        ) : aiFinderHref ? (
          <Link
            href={aiFinderHref}
            className="hidden h-10 items-center gap-1.5 rounded-2xl border border-[#40ADA8]/35 bg-[#40ADA8]/10 px-3 text-xs font-semibold text-[#2f7f7a] shadow-sm hover:bg-[#40ADA8]/20 sm:inline-flex"
            title="AI-gestuurde zoekopdracht"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            AI
          </Link>
        ) : null}
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-[#40ADA8]/30 hover:text-[#40ADA8]"
          >
            <Shield className="inline h-3.5 w-3.5" /> Admin
          </Link>
        )}
        <Link
          href="/notifications"
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
          href="/profile"
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[#40ADA8] text-sm font-semibold text-white shadow-sm"
          aria-label="Profiel"
        >
          {userAvatarUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatarUrl} alt={userDisplayName ?? "Profiel"} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </Link>
        {isDemandSide && (
          <Link href="/jobs/new">
            <button className="ml-1 hidden h-11 rounded-2xl bg-[#40ADA8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#369590] md:inline-flex">
              + Plaats opdracht
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
