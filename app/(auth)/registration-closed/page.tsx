import Link from "next/link";

export default function RegistrationClosedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 text-center shadow-xl">
        <h1 className="text-xl font-semibold text-slate-900">Registration temporarily closed</h1>
        <p className="mt-3 text-sm text-slate-600">
          We are not accepting new accounts right now. Please check back soon — existing users can still sign in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary-600 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
