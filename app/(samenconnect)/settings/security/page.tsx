"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

const MIN_LEN = 8;

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < MIN_LEN) {
      setError(`Nieuw wachtwoord moet minimaal ${MIN_LEN} tekens zijn.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Nieuwe wachtwoorden komen niet overeen.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Kies een ander wachtwoord dan je huidige.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;
      if (!session?.user?.email) {
        setError("Geen actieve sessie. Log opnieuw in en probeer het nog eens.");
        return;
      }

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (verifyErr) {
        setError("Huidig wachtwoord klopt niet of de sessie is verlopen.");
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError(updateErr.message || "Wachtwoord bijwerken mislukt.");
        return;
      }

      setSuccess("Je wachtwoord is bijgewerkt. Je blijft ingelogd.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Beveiliging"
        description="Wijzig je wachtwoord. Je moet je huidige wachtwoord bevestigen."
        backHref="/profile"
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-500" aria-hidden />
            <CardTitle className="text-lg">Wachtwoord</CardTitle>
          </div>
          <CardDescription>
            Gebruik een sterk wachtwoord dat je nergens anders gebruikt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium text-slate-700">
                Huidig wachtwoord
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                Nieuw wachtwoord
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={MIN_LEN}
              />
              <p className="text-xs text-slate-500">Minimaal {MIN_LEN} tekens.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                Bevestig nieuw wachtwoord
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={MIN_LEN}
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {success}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Opslaan…" : "Wachtwoord opslaan"}
              </Button>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "outline", size: "md" }), "inline-flex")}
              >
                Terug
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
