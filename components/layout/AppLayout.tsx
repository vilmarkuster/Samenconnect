"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ZorentaTopbar } from "./ZorentaTopbar";

type AppLayoutProps = {
  children: ReactNode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userDisplayName?: string | null;
  unreadNotifications?: number;
  onLogout?: () => void;
  isAdmin?: boolean;
};

export function AppLayout({
  children,
  sidebarOpen,
  setSidebarOpen,
  userDisplayName,
  unreadNotifications = 0,
  onLogout,
  isAdmin,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="fixed right-4 top-16 z-[9999] rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
        APP LAYOUT
      </div>
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
            unreadNotifications={unreadNotifications}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={onLogout}
            isAdmin={isAdmin}
          />
        </header>
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
