"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";

type AdminGuardState = "loading" | "allowed" | "forbidden" | "error";

export default function ZorentaAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<AdminGuardState>("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getZorentaAccessToken()
      .then((token) => {
        if (cancelled) return null;
        if (!token) {
          setState("forbidden");
          setMessage("Geen actieve SamenConnect-sessie gevonden.");
          return null;
        }
        return fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
      })
      .then((res) => {
        if (cancelled || res === null) return null;
        if (!res.ok) {
          return res.json().then((d) => {
            const err = typeof d?.error === "string" ? d.error : `Status ${res.status}`;
            if (res.status === 401 || res.status === 403) {
              setState("forbidden");
              setMessage(err);
            } else {
              setState("error");
              setMessage(err);
            }
            return null;
          });
        }
        return res.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (d.profile?.role === "admin") {
          setState("allowed");
          setMessage(null);
        } else {
          setState("forbidden");
          setMessage(`Je rol is '${d.profile?.role ?? "onbekend"}', admin toegang vereist.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Onbekende fout bij laden van admin status.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Only redirect after a short delay, and only from forbidden state.
  useEffect(() => {
    if (state !== "forbidden") return;
    const t = setTimeout(() => {
      router.replace("/zorenta/dashboard");
    }, 1500);
    return () => clearTimeout(t);
  }, [state, router]);

  const baseWrapper = (content: React.ReactNode) => (
    <div className="min-h-[60vh] rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Admin toegang</h1>
      {content}
    </div>
  );

  if (state === "loading") {
    return baseWrapper(
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-medium text-slate-700">Admin toegang controleren...</p>
        <p className="text-xs text-slate-500">
          We halen je SamenConnect-profiel op en controleren of je admin-rechten hebt.
        </p>
      </div>
    );
  }

  if (state === "forbidden") {
    return baseWrapper(
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Admin access denied</p>
        <p className="mt-1">
          {message ?? "Je hebt geen admin-rechten voor deze omgeving. Je wordt doorgestuurd naar het dashboard."}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return baseWrapper(
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-semibold">Admin guard fout</p>
        <p className="mt-1">
          {message ?? "Er is een onbekende fout opgetreden tijdens het laden van admin data."}
        </p>
      </div>
    );
  }

  // allowed
  return <>{children}</>;
}
