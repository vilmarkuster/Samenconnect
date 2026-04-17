"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { Briefcase, Search, PlusCircle, MapPin, Clock3, BadgeCheck } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";
import { JobListingCover } from "@/components/zorenta/job-listing-cover";
import { formatJobPrice } from "@/lib/zorenta/job-price";
import { cn } from "@/lib/utils";

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
  image_urls?: string[] | null;
};

type Me = { profile: { role: string } | null };

function readableLocation(city: string | null | undefined): string {
  const val = (city ?? "").trim();
  return val || "Locatie in overleg";
}

function ZorentaJobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterCareType, setFilterCareType] = useState("");
  const [radius, setRadius] = useState<string>("25");
  const [jobMatchMap, setJobMatchMap] = useState<Record<string, { score: number; summary: string; narrativeSummary?: string }>>({});
  const [favoriteJobIds, setFavoriteJobIds] = useState<Set<string>>(() => new Set());
  const [togglingFavoriteJobId, setTogglingFavoriteJobId] = useState<string | null>(null);
  const [heartBumpJobId, setHeartBumpJobId] = useState<string | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [intakeLinkedJobIds, setIntakeLinkedJobIds] = useState<Set<string>>(() => new Set());
  // Small timeout to reset the bump animation.
  const heartBumpTimeoutRef = useRef<number | null>(null);
  const showCreatedSuccess = searchParams.get("created") === "1";

  const canCreateJobs = myRole === "client" || myRole === "organization";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      const supabase = getSupabaseClient();
      let userId: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id ? String(userData.user.id) : null;
      } catch {
        userId = null;
      }
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
      let linkedFromIntake = new Set<string>();
      if (token) {
        const meRes = await fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
        const meData = await meRes.json().catch(() => ({}));
        role = meData.profile?.role ?? null;

        // The matching endpoint is caregiver-only; avoid 403 spam for clients/organizations.
        if (role === "caregiver") {
          const matchRes = await fetch("/api/zorenta/matching/jobs-for-me", { headers: zorentaHeaders(token) });
          const matchData = await matchRes.json().catch(() => ({}));
          if (Array.isArray(matchData.matches)) {
            matchMap = Object.fromEntries(
              matchData.matches.map(
                (m: {
                  job: { id: string };
                  score: number;
                  summary: string;
                  narrativeSummary?: string;
                }) => [
                  m.job.id,
                  {
                    score: m.score,
                    summary: m.summary,
                    narrativeSummary: m.narrativeSummary,
                  },
                ]
              )
            );
          }
        }

        if (role === "client" || role === "organization") {
          const intakeRes = await fetch("/api/zorenta/intake", { headers: zorentaHeaders(token) });
          const intakeData = await intakeRes.json().catch(() => ({}));
          const rows: Array<{ job_id?: string | null }> = Array.isArray(intakeData?.intakes)
            ? intakeData.intakes
            : [];
          linkedFromIntake = new Set(
            rows
              .map((r) => (typeof r?.job_id === "string" ? r.job_id.trim() : ""))
              .filter((id) => id.length > 0)
          );
        }
      }

      // Load favorites (for heart state)
      let favSet = new Set<string>();
      if (userId) {
        const { data: favRows } = await supabase
          .from("favorites")
          .select("job_id")
          .eq("user_id", userId);
        favSet = new Set((favRows ?? []).map((r: { job_id: string }) => String(r.job_id)));
      }
      if (!cancelled) {
        if (jobsData.jobs) setJobs(jobsData.jobs);
        setMyRole(role);
        setJobMatchMap(matchMap);
        setMyUserId(userId);
        setFavoriteJobIds(favSet);
        setIntakeLinkedJobIds(linkedFromIntake);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterCity, filterCareType, radius]);

  async function toggleFavorite(jobId: string) {
    if (!myUserId) {
      setFavoriteFeedback({
        type: "error",
        text: "Log in om opdrachten op te slaan in je favorieten.",
      });
      return;
    }
    const currentlyFav = favoriteJobIds.has(jobId);
    const nextFav = !currentlyFav;

    // Optimistic update
    setFavoriteJobIds((prev) => {
      const next = new Set(prev);
      if (nextFav) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
    setHeartBumpJobId(jobId);
    if (heartBumpTimeoutRef.current) window.clearTimeout(heartBumpTimeoutRef.current);
    heartBumpTimeoutRef.current = window.setTimeout(() => setHeartBumpJobId(null), 450);
    setTogglingFavoriteJobId(jobId);

    try {
      const token = await getZorentaAccessToken();
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ userId: myUserId, jobId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data?.status !== "added" && data?.status !== "removed")) {
        throw new Error(typeof data?.error === "string" ? data.error : "Toggle failed.");
      }
      setFavoriteFeedback({
        type: "success",
        text: data.status === "added" ? "Toegevoegd aan favorieten." : "Verwijderd uit favorieten.",
      });
      // Ensure final state matches server response
      if (data.status === "added" && !nextFav) {
        setFavoriteJobIds((prev) => new Set(prev).add(jobId));
      }
      if (data.status === "removed" && nextFav) {
        setFavoriteJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    } catch {
      // Revert on error
      setFavoriteJobIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      setFavoriteFeedback({
        type: "error",
        text: "Favoriet opslaan is niet gelukt. Probeer het opnieuw.",
      });
    } finally {
      setTogglingFavoriteJobId(null);
    }
  }

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="wide" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
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
      {showCreatedSuccess && (
        <div
          className="rounded-2xl border border-[#40ADA8]/20 bg-[#40ADA8]/10 px-4 py-3 text-sm font-medium text-[#2f7f7a]"
          role="status"
        >
          Opdracht is geplaatst.
        </div>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#40ADA8]/10 px-3 py-1 text-xs font-semibold text-[#40ADA8]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Opdrachtenmarkt
            </div>
            <ZorentaPageHeader
              title="Opdrachten"
              description="Vind zorgopdrachten, filter op plaats en type, en plaats eenvoudig een nieuwe opdracht."
            />
          </div>
          <div className="grid gap-2 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.2fr)_auto_auto_auto_auto]">
            <div className="min-w-0">
              <CityAutocomplete value={city} onChange={setCity} placeholder="Plaats (stad)" />
            </div>
            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-[#40ADA8] focus:outline-none focus:ring-4 focus:ring-[#40ADA8]/15"
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
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-[#40ADA8] focus:outline-none focus:ring-4 focus:ring-[#40ADA8]/15"
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
              className="h-11 w-full rounded-xl border-slate-200 bg-white px-4 text-slate-700 shadow-sm"
            >
              <Search className="h-4 w-4" />
              Zoeken
            </Button>
            {canCreateJobs && (
              <Link href="/jobs/new">
                <Button size="sm" className="h-11 w-full rounded-xl bg-[#40ADA8] px-4 text-white hover:bg-[#369e9a]">
                  <PlusCircle className="h-4 w-4" />
                  Plaats opdracht
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {jobs.length === 0 ? (
        <ZorentaEmptyState
          icon={Briefcase}
          title={canCreateJobs ? "Plaats je eerste opdracht" : "Geen opdrachten gevonden"}
          description={canCreateJobs ? "Zet je zorgvraag om in een opdracht. Zorgverleners kunnen dan reageren." : "Pas je filters aan of bekijk later opnieuw."}
          action={
            canCreateJobs ? (
              <Link href="/jobs/new">
                <Button className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Plaats je eerste opdracht
                </Button>
              </Link>
            ) : (
              <Link href="/search">
                <Button variant="outline">Zorgverleners zoeken</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const match = jobMatchMap[job.id];
            const priceLabel = formatJobPrice({
              hourly_rate: job.hourly_rate,
              budget_min: job.budget_min,
              budget_max: job.budget_max,
            });
            return (
              <article
                key={job.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative">
                  <JobListingCover
                    imageUrls={job.image_urls}
                    careType={job.care_type}
                    alt=""
                    className="aspect-[16/9] rounded-t-3xl"
                  />
                  <div className="absolute left-4 top-4 max-w-[80%] truncate rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {job.care_type || "Zorg"}
                  </div>
                </div>
                <div className="flex flex-1 flex-col space-y-2.5 p-5 sm:p-6">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 min-h-[3.15rem] text-lg font-semibold leading-6 text-slate-900">
                          {job.title}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{readableLocation(job.city)}</span>
                        </div>
                        {intakeLinkedJobIds.has(job.id) ? (
                          <div className="mt-1.5">
                            <Badge
                              variant="outline"
                              className="rounded-full border-[#40ADA8]/35 bg-[#40ADA8]/10 text-[11px] text-[#2f7f7a]"
                            >
                              Aangemaakt vanuit zorgvraag
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {match && (
                          <Badge className="rounded-full bg-[#40ADA8] px-3 py-1 text-white">
                            Match {Math.round(match.score)}%
                          </Badge>
                        )}
                        <button
                          type="button"
                          aria-label={favoriteJobIds.has(job.id) ? "Verwijderen uit favorieten" : "Toevoegen aan favorieten"}
                          className={[
                            "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-base shadow-sm transition-all duration-200 ease-out",
                            "hover:bg-slate-50 hover:shadow-md active:scale-[0.96]",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                            togglingFavoriteJobId === job.id ? "opacity-80" : "",
                            heartBumpJobId === job.id ? "animate-bounce" : "",
                            favoriteJobIds.has(job.id) ? "scale-110" : "",
                          ].join(" ")}
                          onClick={() => toggleFavorite(job.id)}
                          disabled={togglingFavoriteJobId === job.id}
                        >
                          {togglingFavoriteJobId === job.id
                            ? "…"
                            : favoriteJobIds.has(job.id)
                              ? "❤️"
                              : "🤍"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 whitespace-nowrap">
                      <Clock3 className="h-4 w-4 text-[#40ADA8]" />
                      {priceLabel ?? "Tarief in overleg"}
                    </div>
                  </div>
                  <div className="flex min-h-[2.1rem] flex-wrap gap-1.5">
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                      PGB
                    </Badge>
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                      Langdurig
                    </Badge>
                    <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
                      Flexibel
                    </Badge>
                  </div>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-2xl border-slate-200 bg-white whitespace-nowrap"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      Bekijk opdracht
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 rounded-2xl bg-[#40ADA8] text-white hover:bg-[#369e9a] whitespace-nowrap"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      {myRole === "caregiver" ? "Solliciteer" : "Bekijk details"}
                    </Button>
                  </div>
                </div>
              </article>
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
      <Suspense fallback={<ZorentaPageSkeleton />}>
        <ZorentaJobsContent />
      </Suspense>
    </div>
  );
}
