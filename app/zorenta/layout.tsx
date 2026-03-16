"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminShell } from "@/components/zorenta/admin-shell";

const publicPaths = ["/zorenta/login", "/zorenta/register"];
const isAdminPath = (path: string | null) => path?.startsWith("/zorenta/admin");

export default function ZorentaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPublic = pathname === "/zorenta" || publicPaths.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) router.replace("/zorenta/login");
  }, [isLoading, isAuthenticated, isPublic, router]);

  useEffect(() => {
    if (!isPublic && isAuthenticated) {
      getZorentaAccessToken().then((token) => {
        if (!token) return;
        Promise.all([
          fetch("/api/zorenta/notifications?unread=true", { headers: zorentaHeaders(token) }),
          fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
        ])
          .then(([notifRes, meRes]) => Promise.all([notifRes.json(), meRes.json()]))
          .then(([notifData, meData]) => {
            setUnreadCount(Array.isArray(notifData?.notifications) ? notifData.notifications.length : 0);
            setUserDisplayName(meData?.profile?.display_name ?? null);
          })
          .catch(() => {});
      });
    }
  }, [isPublic, isAuthenticated]);

  if (isPublic) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
            <Link href="/zorenta" className="font-semibold tracking-tight text-slate-900">
              Zorenta
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/zorenta/login" className="text-slate-600 hover:text-slate-900">
                Inloggen
              </Link>
              <Link href="/zorenta/register" className="text-slate-600 hover:text-slate-900">
                Registreren
              </Link>
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
                Back to App
              </Link>
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
          <p className="text-sm text-slate-500">Laden…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Redirect naar inloggen…</p>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/zorenta/login");
  }

  if (isAdminPath(pathname)) {
    return <AdminShell onLogout={handleLogout}>{children}</AdminShell>;
  }

  return (
    <AppLayout
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      userDisplayName={userDisplayName}
      unreadNotifications={unreadCount}
      onLogout={handleLogout}
    >
      {children}
    </AppLayout>
  );
}
