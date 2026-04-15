"use client";

import { ReactNode } from "react";
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
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 md:min-h-0">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <Sidebar onLogout={onLogout} isAdmin={isAdmin} />
      </aside>
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white md:hidden">
            <Sidebar
              onNavigate={() => setSidebarOpen(false)}
              onLogout={onLogout}
              isAdmin={isAdmin}
            />
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="h-16 border-b border-slate-200 bg-white">
          <ZorentaTopbar
            userDisplayName={userDisplayName}
            userAvatarUrl={userAvatarUrl}
            unreadNotifications={unreadNotifications}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={onLogout}
            isAdmin={isAdmin}
          />
        </header>
        <main className="min-h-0 min-w-0 w-full flex-1 overflow-auto px-4 py-6 sm:px-6 md:flex-none md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
