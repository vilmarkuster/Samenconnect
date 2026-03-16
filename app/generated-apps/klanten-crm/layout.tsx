"use client";

import Link from "next/link";

export default function GeneratedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50/80">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 shadow-soft backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/generated-apps/klanten-crm/pages/dashboard" className="text-lg font-semibold tracking-tight text-slate-900">Klanten CRM</Link>
          <nav className="flex gap-1 text-sm">
            <Link href="/generated-apps/klanten-crm/pages/dashboard" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Dashboard</Link>
            <Link href="/generated-apps/klanten-crm/pages/klanten" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Klanten</Link>
            <Link href="/generated-apps/klanten-crm/pages/contactpersonen" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Contactpersonen</Link>
            <Link href="/generated-apps/klanten-crm/pages/deals" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Deals</Link>
            <Link href="/generated-apps/klanten-crm/pages/taken" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Taken</Link>
            <Link href="/generated-apps/klanten-crm/pages/activiteiten" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Activiteiten</Link>
            <Link href="/generated-apps/klanten-crm/pages/rapportages" className="rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">Rapportages</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
