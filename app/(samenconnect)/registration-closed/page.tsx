import Link from "next/link";

export default function ZorentaRegistrationClosedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Registratie tijdelijk gesloten</h1>
      <p className="mt-3 text-sm text-slate-600">
        Nieuwe accounts zijn op dit moment niet mogelijk. Bestaande gebruikers kunnen gewoon inloggen. We openen
        registratie binnenkort weer.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-[#40ADA8] px-6 text-sm font-medium text-white transition-colors hover:bg-[#369e9a]"
      >
        Naar inloggen
      </Link>
    </div>
  );
}
