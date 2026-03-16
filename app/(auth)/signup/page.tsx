"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        // eslint-disable-next-line no-console
        console.error("Supabase signup error", signUpError);
        throw signUpError;
      }

      if (data.user && !data.session) {
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        setInfo("Account created. Redirecting to login…");
      }

      // After short delay, go to login page
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err: any) {
      const message =
        err?.message || (typeof err === "string" ? err : "Signup failed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign up with your email and a secure password.
        </p>

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
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="space-y-1">
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
              <p className="text-xs font-mono text-red-700 bg-red-50/80 border border-dashed border-red-200 rounded-md px-3 py-1 break-all">
                Debug: {error}
              </p>
            </div>
          )}

          {info && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              {info}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Signing up..." : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-500 hover:text-primary-600"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

