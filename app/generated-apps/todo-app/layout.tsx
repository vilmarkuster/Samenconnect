"use client";

import Link from "next/link";

export default function GeneratedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/generated-apps/todo-app/pages/dashboard" className="text-lg font-semibold text-slate-900">Todo App</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/generated-apps/todo-app/pages/dashboard" className="text-slate-600 hover:text-slate-900">Dashboard</Link>
            <Link href="/generated-apps/todo-app/pages/todos" className="text-slate-600 hover:text-slate-900">Todos</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
