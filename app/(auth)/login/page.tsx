"use client";

import { Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

/** Same-origin only under /zorenta — voorkomt open redirect + App Builder als default */
function safeSamenConnectPostLoginPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/zorenta/dashboard";
  if (!next.startsWith("/zorenta")) return "/zorenta/dashboard";
  return next;
}

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      setError(null);
      const dest = safeSamenConnectPostLoginPath(searchParams.get("next"));
      // Volledige navigatie zodat cookies/session consistent zijn (zelfde patroon als /zorenta/login)
      window.location.assign(dest);
    } catch (err: any) {
      // Surface the real Supabase error and log for debugging
      // eslint-disable-next-line no-console
      console.error("Login failed", err);
      const message =
        err?.message || (typeof err === "string" ? err : "Login failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to access your dashboard.
        </p>

        {!REGISTRATION_OPEN && (
          <p
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900"
            role="status"
          >
            Registratie binnenkort beschikbaar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <span className="font-medium text-slate-400">Registratie binnenkort beschikbaar</span>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"><div className="text-slate-400">Loading...</div></main>}>
      <LoginForm />
    </Suspense>
  );
}
