"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ZorentaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("[Zorenta]", error.message, error.digest);
    }
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900">Er is iets misgegaan</h2>
      <p className="max-w-md text-center text-sm text-slate-600">
        {error.message || "Er is een fout opgetreden. Probeer het opnieuw."}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Opnieuw proberen
        </Button>
        <a
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
        >
          Naar dashboard
        </a>
      </div>
    </div>
  );
}
