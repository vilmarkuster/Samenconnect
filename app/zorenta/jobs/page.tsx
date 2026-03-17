"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaJobCard } from "@/components/zorenta/job-card";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { Briefcase, Search, PlusCircle } from "lucide-react";

const CARE_TYPES = [
  "",
  "Thuiszorg",
  "Verpleeghuis",
  "Gehandicaptenzorg",
  "Dementiezorg",
  "Palliatieve zorg",
  "Kraamzorg",
  "Overig",
];

type Job = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  care_type: string | null;
  status: string;
  created_at: string;
  schedule?: string | null;
  availability?: string | null;
  hourly_rate?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

type Me = { profile: { role: string } | null };

function ZorentaJobsContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterCareType, setFilterCareType] = useState("");
  const [radius, setRadius] = useState<string>("25");
  const [jobMatchMap, setJobMatchMap] = useState<Record<string, { score: number; summary: string; narrativeSummary?: string }>>({});
  const showCreatedSuccess = searchParams.get("created") === "1";

  const canCreateJobs = myRole === "client" || myRole === "organization";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      const params = new URLSearchParams();
      params.set("status", "open");
      if (filterCity) params.set("city", filterCity);
      if (filterCareType) params.set("care_type", filterCareType);
      if (radius) params.set("radius", radius);
      const jobsRes = await fetch(`/api/zorenta/jobs?${params}`, {
        headers: token ? zorentaHeaders(token) : {},
      });
      const jobsData = await jobsRes.json().catch(() => ({}));
      let role: string | null = null;
      let matchMap: Record<string, { score: number; summary: string; narrativeSummary?: string }> = {};
      if (token) {
        const [meRes, matchRes] = await Promise.all([
          fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
          fetch("/api/zorenta/matching/jobs-for-me", { headers: zorentaHeaders(token) }),
        ]);
        const meData = await meRes.json().catch(() => ({}));
        role = meData.profile?.role ?? null;
        const matchData = await matchRes.json().catch(() => ({}));
        if (Array.isArray(matchData.matches)) {
          matchMap = Object.fromEntries(
            matchData.matches.map((m: { job: { id: string }; score: number; summary: string; narrativeSummary?: string }) => [
              m.job.id,
              { score: m.score, summary: m.summary, narrativeSummary: m.narrativeSummary },
            ])
          );
        }
      }
      if (!cancelled) {
        if (jobsData.jobs) setJobs(jobsData.jobs);
        setMyRole(role);
        setJobMatchMap(matchMap);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterCity, filterCareType, radius]);

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="wide" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      {showCreatedSuccess && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Vacature is geplaatst.
        </div>
      )}
      <ZorentaPageHeader
        title="Vacatures"
        description="Zoek en bekijk zorgvacatures."
        actions={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-9 w-36 sm:w-40">
                <CityAutocomplete
                  value={city}
                  onChange={setCity}
                  placeholder="Plaats (stad)"
                />
              </div>
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
              <select
                value={filterCareType}
                onChange={(e) => setFilterCareType(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {CARE_TYPES.map((t) => (
                  <option key={t || "all"} value={t}>
                    {t || "Alle types"}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterCity(city)}
                className="gap-1.5"
              >
                <Search className="h-4 w-4" />
                Zoeken
              </Button>
            </div>
            {canCreateJobs && (
              <Link href="/zorenta/jobs/new">
                <Button size="sm" className="gap-1.5">
                  <PlusCircle className="h-4 w-4" />
                  Nieuwe vacature
                </Button>
              </Link>
            )}
          </>
        }
      />

      {jobs.length === 0 ? (
        <ZorentaEmptyState
          icon={Briefcase}
          title={canCreateJobs ? "Plaats je eerste vacature" : "Geen vacatures gevonden"}
          description={canCreateJobs ? "Zet je zorgvraag om in een vacature. Zorgverleners kunnen dan solliciteren." : "Pas je filters aan of bekijk later opnieuw."}
          action={
            canCreateJobs ? (
              <Link href="/zorenta/jobs/new">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Plaats je eerste vacature
                </Button>
              </Link>
            ) : (
              <Link href="/zorenta/search">
                <Button variant="outline">Zorgverleners zoeken</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const match = jobMatchMap[job.id];
            return (
              <ZorentaJobCard
                key={job.id}
                job={{
                  id: job.id,
                  title: job.title,
                  description: job.description,
                  city: job.city,
                  care_type: job.care_type,
                  status: job.status,
                  schedule: job.schedule,
                  availability: job.availability,
                  hourly_rate: job.hourly_rate,
                  budget_min: job.budget_min,
                  budget_max: job.budget_max,
                }}
                match={
                  match
                    ? {
                        score: match.score,
                        summary: match.summary,
                        narrativeSummary: match.narrativeSummary,
                      }
                    : null
                }
              />
            );
          })}
        </div>
      )}
    </ZorentaPageContainer>
  );
}

export default function ZorentaJobsPage() {
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md bg-black px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
        JOBS PAGE
      </div>
      <Suspense fallback={<ZorentaPageSkeleton />}>
        <ZorentaJobsContent />
      </Suspense>
    </div>
  );
}
