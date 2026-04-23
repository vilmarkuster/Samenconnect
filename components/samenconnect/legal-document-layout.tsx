import type { ReactNode } from "react";
import Link from "next/link";

const LAST_UPDATED = "31 maart 2026";

export function LegalDocumentLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl text-slate-800">
      <nav aria-label="Broodkruimel">
        <Link href="/" className="text-sm font-medium text-emerald-800 underline-offset-4 hover:underline">
          ← Terug naar home
        </Link>
      </nav>
      <header className="mt-6 border-b border-slate-200 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>
        ) : null}
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
          Laatst bijgewerkt: {LAST_UPDATED}
        </p>
      </header>
      <div className="mt-10 space-y-12 pb-8">{children}</div>
      <footer className="border-t border-slate-200 pt-8 text-sm text-slate-600">
        <p>
          Vragen? Neem contact op via{" "}
          <a href="mailto:info@samenconnect.nl" className="font-medium text-emerald-800 underline-offset-2 hover:underline">
            info@samenconnect.nl
          </a>
          .
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Dit document is bedoeld als praktische informatie voor gebruikers van SamenConnect. Het vervangt geen
          individueel juridisch advies. Bij twijfel raden wij aan een advocaat of privacydeskundige te raadplegen.
        </p>
      </footer>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-[15px] sm:leading-7">{children}</div>
    </section>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalUl({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-slate-400">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
