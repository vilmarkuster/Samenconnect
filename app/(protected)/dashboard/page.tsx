"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route `/dashboard` (AI App Builder) is no longer the default landingspagina:
 * ingelogde gebruikers gaan naar SamenConnect. Middleware stuurt meestal al server-side door;
 * deze client redirect vangt edge cases (bijv. ontbrekende env in middleware).
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/zorenta/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-slate-500">Doorsturen naar SamenConnect…</p>
    </div>
  );
}
