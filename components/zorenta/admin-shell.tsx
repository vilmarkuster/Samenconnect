"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";

type AdminShellProps = {
  children: ReactNode;
  onLogout?: () => void;
};

export function AdminShell({ children, onLogout }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden md:block md:w-64 md:shrink-0">
        <AdminSidebar onLogout={onLogout} />
      </aside>
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white shadow-xl md:hidden">
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} onLogout={onLogout} />
          </div>
        </>
      )}
      <div className="min-w-0 flex-1 flex flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-medium text-slate-800">Zorenta Admin</span>
        </header>
        <main className="min-w-0 flex-1 overflow-auto bg-slate-50 p-4 md:p-6 lg:p-8">
          {children ?? <p className="text-sm text-slate-500">No content</p>}
        </main>
      </div>
    </div>
  );
}
