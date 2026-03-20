"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Briefcase, MapPin, Clock3 } from "lucide-react";

type Job = {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  care_type?: string | null;
  status: string;
  created_at: string;
  schedule?: string | null;
  availability?: string | null;
  hourly_rate?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

type FavoriteRow = { job_id: string; created_at: string };

export default function FavoritesPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [favoriteJobIds, setFavoriteJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [heartBumpJobId, setHeartBumpJobId] = useState<string | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const heartBumpTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          if (!cancelled) {
            setIsAuthenticated(false);
            setJobs([]);
            setFavoriteJobIds(new Set());
            setLoading(false);
          }
          return;
        }

        if (!cancelled) setIsAuthenticated(true);

        const userId = userData.user.id;

        // Preferred: single query with nested select (join) on `care_jobs`.
        // If the nested relationship name differs in your Supabase setup,
        // we fall back to a safe two-query mapping.
        let orderedJobs: Job[] = [];
        let idSet = new Set<string>();

        try {
          const { data: joinedRows, error: joinedErr } = await supabase
            .from("favorites")
            .select("job_id, created_at, care_jobs(*)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          if (joinedErr) throw joinedErr;

          const rows = (joinedRows ?? []) as Array<FavoriteRow & { care_jobs?: any }>;
          idSet = new Set(rows.map((r) => String(r.job_id)));
          orderedJobs = rows
            .map((r) => {
              const cj = r.care_jobs;
              if (Array.isArray(cj)) return cj[0] as Job | null;
              return cj as Job | null;
            })
            .filter(Boolean) as Job[];
        } catch {
          const { data: favRows } = await supabase
            .from("favorites")
            .select("job_id, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

          const favList = (favRows ?? []) as FavoriteRow[];
          const ids = favList.map((f) => f.job_id);
          idSet = new Set(ids);

          if (ids.length === 0) {
            orderedJobs = [];
          } else {
            const { data: jobsRows, error: jobsErr } = await supabase
              .from("care_jobs")
              .select("*")
              .in("id", ids);
            if (jobsErr) throw jobsErr;

            const byId = new Map((jobsRows ?? []).map((j) => [j.id, j] as const));
            orderedJobs = ids.map((id) => byId.get(id)).filter(Boolean) as Job[];
          }
        }

        if (!cancelled) {
          setJobs(orderedJobs);
          setFavoriteJobIds(idSet);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load favorites.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleFavorite(jobId: string) {
    if (togglingJobId) return;
    const token = await getZorentaAccessToken();
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const currentlyFav = favoriteJobIds.has(jobId);
    const nextFav = !currentlyFav;

    // Optimistic update for favorites-only page
    setFavoriteJobIds((prev) => {
      const next = new Set(prev);
      if (nextFav) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
    setHeartBumpJobId(jobId);
    if (heartBumpTimeoutRef.current) window.clearTimeout(heartBumpTimeoutRef.current);
    heartBumpTimeoutRef.current = window.setTimeout(() => setHeartBumpJobId(null), 450);
    if (!nextFav) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    }
    setTogglingJobId(jobId);

    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ userId, jobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data?.status !== "added" && data?.status !== "removed")) {
        throw new Error(typeof data?.error === "string" ? data.error : "Toggle failed.");
      }
      setFavoriteFeedback({
        type: "success",
        text: data.status === "removed"
          ? "Vacature verwijderd uit favorieten."
          : "Vacature toegevoegd aan favorieten.",
      });

      // If it was added but we removed optimisticly (or vice versa), we can re-sync by reload.
      if (data.status === "added" && !nextFav) {
        // best-effort: reload list
        window.location.reload();
      }
    } catch {
      // Revert on error
      setFavoriteJobIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      if (currentlyFav) {
        // put job back by reloading for simplicity
        window.location.reload();
      }
      setFavoriteFeedback({
        type: "error",
        text: "Favorieten bijwerken is niet gelukt. Probeer het opnieuw.",
      });
    } finally {
      setTogglingJobId(null);
    }
  }

  const empty = !loading && jobs.length === 0;

  if (loading) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6 py-8">
        <ZorentaPageHeader
          title="Favorieten"
          description="Je favorieten worden geladen…"
          backHref="/zorenta/jobs"
          backLabel="Vacatures"
        />
      </PageContainer>
    );
  }

  if (isAuthenticated === false) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6 py-8">
        <ZorentaPageHeader
          title="Favorieten"
          description="Log in om je favorieten te bekijken."
          backHref="/zorenta/jobs"
          backLabel="Vacatures"
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">Je bent nog niet ingelogd.</p>
          <div className="mt-4">
            <Link href="/zorenta/login?next=/favorites">
              <Button variant="outline">Inloggen</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="wide" className="space-y-6 py-8">
      <ZorentaPageHeader
        title="Favorieten"
        description="Je opgeslagen vacatures."
        backHref="/zorenta/jobs"
        backLabel="Vacatures"
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {favoriteFeedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            favoriteFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
        >
          {favoriteFeedback.text}
        </div>
      )}

      {empty ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-800">Nog geen favorieten</p>
          <p className="mt-1 text-sm text-slate-500">Bewaar vacatures met het hartje.</p>
          <div className="mt-4">
            <Link href="/zorenta/jobs">
              <Button variant="outline">Bekijk vacatures</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const isFav = favoriteJobIds.has(job.id);
            return (
              <article
                key={job.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-28 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-50">
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {job.care_type || "Zorg"}
                  </div>
                  <button
                    type="button"
                    aria-label={isFav ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleFavorite(job.id);
                    }}
                    disabled={togglingJobId === job.id}
                    className={[
                      "absolute right-4 top-4 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-base shadow-sm",
                      "transition-all duration-200 ease-out",
                      "hover:bg-slate-50 hover:shadow-md active:scale-[0.96]",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      heartBumpJobId === job.id ? "animate-bounce" : "",
                      isFav ? "scale-110" : "",
                      togglingJobId === job.id ? "opacity-80" : "",
                    ].join(" ")}
                  >
                    {togglingJobId === job.id ? "…" : isFav ? "❤️" : "🤍"}
                  </button>
                </div>
                <div className="space-y-3 p-5">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="h-4 w-4" />
                      {job.city || "Locatie onbekend"}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Clock3 className="h-4 w-4 text-[#40ADA8]" />
                      €{job.hourly_rate ? `${Math.round(job.hourly_rate)}–${Math.round(job.hourly_rate + 3)}` : "15–18"} / uur
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/zorenta/jobs/${job.id}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        Bekijk vacature
                      </Button>
                    </Link>
                  </div>

                  {job.status && (
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                      {job.status}
                    </Badge>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

