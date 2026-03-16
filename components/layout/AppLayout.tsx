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
};

export function AppLayout({
  children,
  sidebarOpen,
  setSidebarOpen,
  userDisplayName,
  unreadNotifications = 0,
  onLogout,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:w-64 md:shrink-0">
        <Sidebar onLogout={onLogout} />
      </aside>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white shadow-xl md:hidden">
            <Sidebar
              onNavigate={() => setSidebarOpen(false)}
              onLogout={onLogout}
            />
          </div>
        </>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <ZorentaTopbar
          userDisplayName={userDisplayName}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
