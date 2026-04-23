"use client";

import { ReactNode, Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { ZorentaTopbar } from "./ZorentaTopbar";

type AppLayoutProps = {
  children: ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  unreadNotifications?: number;
  onLogout?: () => void;
  isAdmin?: boolean;
  userRole?: string | null;
  /** When false, Sidebar omits role-restricted links until /api/zorenta/me has resolved. */
  userRoleReady?: boolean;
};

export function AppLayout({
  children,
  sidebarOpen,
  setSidebarOpen,
  userDisplayName,
  userAvatarUrl,
  unreadNotifications = 0,
  onLogout,
  isAdmin,
  userRole,
  userRoleReady = false,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 md:min-h-0">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <Suspense fallback={<div className="h-full min-h-[240px] w-full bg-[#0f766e]" aria-hidden />}>
          <Sidebar onLogout={onLogout} isAdmin={isAdmin} userRole={userRole} userRoleReady={userRoleReady} />
        </Suspense>
      </aside>
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white md:hidden">
            <Suspense fallback={<div className="h-full min-h-[240px] w-full bg-[#0f766e]" aria-hidden />}>
              <Sidebar
                onNavigate={() => setSidebarOpen(false)}
                onLogout={onLogout}
                isAdmin={isAdmin}
                userRole={userRole}
                userRoleReady={userRoleReady}
              />
            </Suspense>
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 border-b border-slate-200 bg-white">
          <Suspense fallback={<div className="flex h-full w-full items-center px-4 text-sm text-slate-500">Laden…</div>}>
            <ZorentaTopbar
              userDisplayName={userDisplayName}
              userAvatarUrl={userAvatarUrl}
              unreadNotifications={unreadNotifications}
              onMenuClick={() => setSidebarOpen(true)}
              onLogout={onLogout}
              isAdmin={isAdmin}
              userRole={userRole}
              userRoleReady={userRoleReady}
            />
          </Suspense>
        </header>
        <main className="min-h-0 min-w-0 w-full flex-1 overflow-auto px-4 py-6 sm:px-6 md:flex-none md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
