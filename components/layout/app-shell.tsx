import { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/80">
      <div className="fixed right-4 top-4 z-[9999] rounded-lg bg-orange-600 px-3 py-1 text-sm font-bold text-white shadow-lg">
        APP SHELL
      </div>
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
