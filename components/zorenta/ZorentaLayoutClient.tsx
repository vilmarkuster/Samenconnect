"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminShell } from "@/components/zorenta/admin-shell";
import { SamenConnectLogo } from "@/components/samenconnect/logo";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

type ZorentaLayoutMode = "public" | "app";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/register",
  "/registration-closed",
]);

function isPublicPath(path: string | null): boolean {
  if (!path) return false;
  return PUBLIC_PATHS.has(path);
}

const isAdminPath = (path: string | null) => path?.startsWith("/admin");

type Props = {
  children: React.ReactNode;
  mode: ZorentaLayoutMode;
  initialPathname?: string;
};

export function ZorentaLayoutClient({ children, mode, initialPathname }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? initialPathname ?? null;
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  /** False until /api/zorenta/me has finished (success or error), so the sidebar never flashes wrong role-gated links. */
  const [userRoleReady, setUserRoleReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<ZorentaLayoutMode>(mode);

  // Keep shell mode in sync with the actual pathname during client navigation,
  // using only explicit public paths (no window.location or fuzzy matching).
  useEffect(() => {
    const nextMode: ZorentaLayoutMode = isPublicPath(pathname) ? "public" : "app";
    if (nextMode !== currentMode) {
      setCurrentMode(nextMode);
    }
  }, [pathname, currentMode]);

  const isPublic = currentMode === "public";
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) router.replace("/login");
  }, [isLoading, isAuthenticated, isPublic, router]);

  useEffect(() => {
    if (isPublic || !isAuthenticated) {
      setUserRoleReady(false);
      return;
    }

    let cancelled = false;
    setUserRoleReady(false);

    getZorentaAccessToken()
      .then((token) => {
        if (cancelled) return;
        if (!token) {
          setUserRole(null);
          setIsAdmin(false);
          setUnreadCount(0);
          setUserDisplayName(null);
          setUserAvatarUrl(null);
          return;
        }
        return Promise.all([
          fetch("/api/zorenta/notifications?unread=true", { headers: zorentaHeaders(token) }),
          fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
        ])
          .then(([notifRes, meRes]) => Promise.all([notifRes.json(), meRes.json()]))
          .then(([notifData, meData]) => {
            if (cancelled) return;
            setUnreadCount(Array.isArray(notifData?.notifications) ? notifData.notifications.length : 0);
            setUserDisplayName(meData?.profile?.display_name ?? null);
            setUserAvatarUrl(typeof meData?.profile?.avatar_url === "string" ? meData.profile.avatar_url : null);
            const role = typeof meData?.profile?.role === "string" ? meData.profile.role : null;
            setIsAdmin(role === "admin");
            setUserRole(role);
          })
          .catch(() => {
            if (!cancelled) {
              setUserRole(null);
              setIsAdmin(false);
            }
          });
      })
      .finally(() => {
        if (!cancelled) setUserRoleReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isPublic, isAuthenticated]);

  // Allow child pages (e.g. notifications) to adjust the unread bell count optimistically.
  useEffect(() => {
    function handleUnreadDelta(event: Event) {
      const detail = (event as CustomEvent<{ delta?: number; value?: number }>).detail ?? {};
      if (typeof detail.value === "number" && Number.isFinite(detail.value)) {
        setUnreadCount(Math.max(0, detail.value));
        return;
      }
      if (typeof detail.delta === "number" && Number.isFinite(detail.delta) && detail.delta !== 0) {
        setUnreadCount((prev) => Math.max(0, prev + detail.delta!));
      }
    }

    window.addEventListener("zorenta:notifications:unreadDelta", handleUnreadDelta as EventListener);
    return () => {
      window.removeEventListener("zorenta:notifications:unreadDelta", handleUnreadDelta as EventListener);
    };
  }, []);

  if (isPublic) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
            <SamenConnectLogo />
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Inloggen
              </Link>
              {REGISTRATION_OPEN ? (
                <Link href="/register" className="text-slate-600 hover:text-slate-900">
                  Registreren
                </Link>
              ) : (
                <span className="cursor-not-allowed text-sm text-slate-400" title="Registratie tijdelijk gesloten">
                  Registreren binnenkort
                </span>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
          <p className="text-sm text-slate-500">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Redirect naar inloggen...</p>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (isAdminRoute) {
    return <AdminShell onLogout={handleLogout}>{children}</AdminShell>;
  }

  return (
    <AppLayout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      userDisplayName={userDisplayName}
      userAvatarUrl={userAvatarUrl}
      unreadNotifications={unreadCount}
      onLogout={handleLogout}
      isAdmin={isAdmin}
      userRole={userRole}
      userRoleReady={userRoleReady}
    >
      {children}
    </AppLayout>
  );
}
