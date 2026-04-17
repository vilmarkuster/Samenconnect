"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { useAuth } from "@/lib/auth-context";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

const ROLES = [
  { value: "caregiver", label: "Caregiver" },
  { value: "client", label: "Client" },
  { value: "organization", label: "Healthcare organization" }
] as const;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole = ROLES.some((r) => r.value === roleParam) ? roleParam as (typeof ROLES)[number]["value"] : "caregiver";
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>(initialRole);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeOnly, setCompleteOnly] = useState(false);

  const useSessionOnly =
    completeOnly || (!REGISTRATION_OPEN && isAuthenticated);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      getZorentaAccessToken().then((token) => {
        if (token) setCompleteOnly(true);
      });
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (REGISTRATION_OPEN && !completeOnly && roleParam && ROLES.some((r) => r.value === roleParam))
      trackZorentaEvent("signup_started", { role: roleParam });
  }, [roleParam, completeOnly]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let token: string | null = null;
      if (useSessionOnly) {
        token = await getZorentaAccessToken();
      } else {
        if (!REGISTRATION_OPEN) {
          setError("Registratie binnenkort beschikbaar.");
          return;
        }
        const supabase = getSupabaseClient();
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Sign up did not return a user.");
        token = authData.session?.access_token ?? (await getZorentaAccessToken());
        if (!token) {
          setError("Account created. Please check your email to confirm, then sign in.");
          setSubmitting(false);
          return;
        }
      }

      if (!token) throw new Error("Geen sessie. Log in en probeer opnieuw.");

      const res = await fetch("/api/zorenta/auth/register", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ role, display_name: displayName || null })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create profile.");

      trackZorentaEvent("signup_completed", { role });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!REGISTRATION_OPEN && isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Laden…</div>
    );
  }

  if (!REGISTRATION_OPEN && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Registratie</h1>
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Registratie binnenkort beschikbaar</CardTitle>
            <CardDescription>
              Nieuwe accounts zijn tijdelijk gesloten. Bestaande gebruikers kunnen gewoon inloggen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "md" }), "inline-flex w-full")}
            >
              Naar inloggen
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {useSessionOnly ? "Profiel afronden" : "Account aanmaken"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {useSessionOnly
            ? "Kies je rol om door te gaan."
            : "Registreer bij SamenConnect als zorgverlener, cliënt of organisatie."}
        </p>
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">
            {useSessionOnly ? "Profiel afronden" : "SamenConnect account"}
          </CardTitle>
          <CardDescription>
            {useSessionOnly ? "Kies je rol om door te gaan." : "Vul je gegevens in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!useSessionOnly && (
              <>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium text-slate-700">Weergavenaam</label>
              <Input
                id="displayName"
                type="text"
                placeholder="Je naam of organisatie"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Ik ben een</span>
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {ROLES.map((r) => (
                  <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      className="rounded-full border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Bezig…" : useSessionOnly ? "Doorgaan" : "Registreren"}
            </Button>
          </form>
          {!useSessionOnly && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Heb je al een account?{" "}
              <Link href="/login" className="font-medium text-primary-600 hover:underline">
                Inloggen
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ZorentaRegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-slate-500">Laden…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
