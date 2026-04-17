"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

function safePostLoginPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (!next.startsWith("/")) return "/dashboard";
  return next;
}

export default function ZorentaLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const dest = safePostLoginPath(searchParams.get("next"));
      // Full navigation so middleware sees fresh auth cookies on the next request
      window.location.assign(dest);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Inloggen mislukt.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inloggen</h1>
        <p className="mt-1 text-sm text-slate-500">
          SamenConnect verbindt zorgverleners, cliënten en organisaties.
        </p>
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Inloggen bij SamenConnect</CardTitle>
          <CardDescription>Vul je gegevens in om verder te gaan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Wachtwoord</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Bezig…" : "Inloggen"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Nog geen account?{" "}
            {REGISTRATION_OPEN ? (
              <Link href="/register" className="font-medium text-primary-600 hover:underline">
                Registreren
              </Link>
            ) : (
              <span className="font-medium text-slate-400">Registratie binnenkort beschikbaar</span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
