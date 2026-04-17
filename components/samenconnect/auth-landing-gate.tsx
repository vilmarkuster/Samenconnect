"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Logged-in users keep the previous home behaviour: `/` forwards to the platform.
 * Guests see the public marketing landing (server-rendered children).
 */
export function AuthLandingGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#fafafa] px-4">
        <div
          className="h-10 w-10 animate-pulse rounded-full border-2 border-[#40ADA8]/30 border-t-[#40ADA8]"
          aria-hidden
        />
        <p className="text-sm text-slate-600">Doorsturen naar het platform…</p>
      </main>
    );
  }

  return <>{children}</>;
}
