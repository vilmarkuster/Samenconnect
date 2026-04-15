"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { JobListingCover } from "@/components/zorenta/job-listing-cover";
import { REGISTRATION_OPEN } from "@/lib/registration-open";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import {
  Briefcase,
  FileText,
  MessageSquare,
  Search,
  ClipboardList,
  PlusCircle,
  Bell,
  ChevronRight,
  TrendingUp,
  Wallet,
  Star,
  Users,
  ChevronRightCircle,
  Sparkles,
} from "lucide-react";

type JobMatch = {
  job: {
    id: string;
    title: string;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    care_type?: string | null;
    availability?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    hourly_rate?: number | null;
    status?: string;
    /** Opdrachtgever (nodig voor “Reageer” → gesprek) */
    poster_id?: string | null;
    /** Publieke storage-URL’s (o.a. GET /matching/jobs-for-me) */
    image_urls?: string[] | null;
    image_url?: string | null;
    cover_image_url?: string | null;
    photo_url?: string | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

type Me = {
  profile: { id: string; role: string; display_name: string | null } | null;
  caregiver?: unknown;
  client?: unknown;
  organization?: unknown;
};

type DashboardData = {
  role: string;
  openJobsCount?: number;
  applicationsCount?: number;
  recentApplications?: (
    | { id: string; status: string; care_jobs?: { title: string } }
    | { id: string; job_id: string; applicant_id: string; status: string; job_title: string | null; applicant_display_name: string | null; created_at: string }
  )[];
  myJobs?: { id: string; title: string; status: string }[];
  applicationsByJob?: Record<string, number>;
  unreadNotifications?: { id: string; type: string; title: string | null }[];
  intakesCount?: number;
  conversationsCount?: number;
};

export default function ZorentaDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const meRes = await fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
      const meData = await meRes.json().catch(() => ({}));
      if (!cancelled) {
        setMe(meData);
        if (meRes.ok && meData.profile === null) {
          router.replace(REGISTRATION_OPEN ? "/zorenta/register" : "/zorenta/registration-closed");
          return;
        }
        if (meRes.ok && meData.profile) {
          const role = meData.profile.role;
          if (role === "caregiver" && !meData.caregiver) {
            router.replace("/zorenta/caregivers/me/edit");
            return;
          }
          if (role === "client" && !meData.client) {
            router.replace("/zorenta/clients/me/edit");
            return;
          }
          if (role === "organization" && !meData.organization) {
            router.replace("/zorenta/organizations/me/edit");
            return;
          }
        }

        const [dashRes, matchRes] = await Promise.all([
          fetch("/api/zorenta/dashboard", { headers: zorentaHeaders(token) }),
          meData?.profile?.role === "caregiver"
            ? fetch("/api/zorenta/matching/jobs-for-me", { headers: zorentaHeaders(token) })
            : Promise.resolve(
                new Response(JSON.stringify({ matches: [] }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
        ]);
        const dashData = await dashRes.json().catch(() => ({}));
        const matchData = await matchRes.json().catch(() => ({}));

        setDashboard(dashData.role ? dashData : null);
        setJobMatches(Array.isArray(matchData.matches) ? matchData.matches : []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const totalJobs = (dashboard?.myJobs ?? []).length;
  const applicationsCount = dashboard?.applicationsCount ?? 0;
  const intakesCount = dashboard?.intakesCount ?? 0;
  const conversationsCount = dashboard?.conversationsCount ?? 0;
  const unreadNotifCount = dashboard?.unreadNotifications?.length ?? 0;
  const stats = useMemo(
    () => [
      { label: "Nieuwe opdrachten", value: `${totalJobs || 24} opdrachten`, icon: Briefcase },
      { label: "Berichten", value: `${conversationsCount || 5} berichten`, icon: MessageSquare },
      { label: "Matches", value: `${jobMatches.length || 12} matches`, icon: Users },
      { label: "Verdiensten", value: "€1240 deze maand", icon: Wallet },
    ],
    [conversationsCount, jobMatches.length, totalJobs]
  );

  const getStatHref = (label: string): string | null => {
    switch (label) {
      case "Nieuwe opdrachten":
        return "/zorenta/jobs";
      case "Berichten":
        return "/zorenta/berichten";
      case "Matches":
        return "/zorenta/matches";
      default:
        return null;
    }
  };

  if (loading || !me?.profile) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-none space-y-8 py-6 lg:py-10">
        <div className="mb-4 inline-flex rounded-md bg-black px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
          DASHBOARD PAGE
        </div>
        <ZorentaPageSkeleton />
      </div>
    );
  }

  const profile = me.profile;
  const roleLabel =
    profile.role === "caregiver" ? "SamenConnect zorgverlener" : profile.role === "client" ? "SamenConnect cliënt" : "SamenConnect organisatie";

  const profileEditHref =
    profile.role === "caregiver"
      ? "/zorenta/caregivers/me/edit"
      : profile.role === "client"
        ? "/zorenta/clients/me/edit"
        : "/zorenta/organizations/me/edit";

  const hasRoleProfile =
    (profile.role === "caregiver" && me.caregiver) ||
    (profile.role === "client" && me.client) ||
    (profile.role === "organization" && me.organization);

  const displayName = profile.display_name || roleLabel;
  const activeJobs = (dashboard?.myJobs ?? []).filter((j) => j.status === "open").length;

  const progressSteps =
    profile.role === "caregiver"
      ? [
          { done: !!hasRoleProfile, label: "Profiel compleet" },
          { done: jobMatches.length > 0, label: "Beste matches bekeken" },
          { done: applicationsCount > 0, label: "Gesolliciteerd" },
          { done: conversationsCount > 0, label: "Eerste bericht gestuurd" },
        ]
      : [
          { done: !!hasRoleProfile, label: "Profiel compleet" },
          { done: intakesCount > 0, label: "Intake gestart" },
          { done: totalJobs > 0, label: "Eerste opdracht geplaatst" },
          { done: (dashboard?.recentApplications?.length ?? 0) > 0, label: "Eerste match" },
          { done: conversationsCount > 0, label: "Eerste bericht gestuurd" },
        ];
  const progressPct =
    progressSteps.length > 0
      ? Math.round((progressSteps.filter((s) => s.done).length / progressSteps.length) * 100)
      : 100;

  const nextBestAction =
    profile.role === "caregiver"
      ? !hasRoleProfile
        ? { label: "Vul je profiel in", href: profileEditHref }
        : jobMatches.length === 0
          ? { label: "Bekijk opdrachten", href: "/zorenta/jobs" }
          : applicationsCount === 0
            ? { label: "Reageer op een opdracht", href: "/zorenta/jobs" }
            : conversationsCount === 0
              ? { label: "Stuur je eerste bericht", href: "/zorenta/applications" }
              : null
      : !hasRoleProfile
        ? { label: "Vul je profiel in", href: profileEditHref }
        : intakesCount === 0 && totalJobs === 0
          ? { label: "Start zorgvraag intake", href: "/zorenta/intake" }
          : totalJobs === 0
            ? { label: "Plaats je eerste opdracht", href: "/zorenta/jobs/new" }
            : (dashboard?.recentApplications?.length ?? 0) === 0
              ? { label: "Bekijk matches", href: "/zorenta/jobs" }
              : conversationsCount === 0
                ? { label: "Stuur je eerste bericht", href: "/zorenta/applications" }
                : null;

  function buildMatchTags(match: JobMatch): string[] {
    const tags = new Set<string>();
    const add = (t: string) => tags.add(t);

    for (const reason of match.reasons) {
      if (reason.includes("Type zorg match")) add("Zorgtype match");
      if (reason.includes("Vaardigheden match")) add("Vaardigheden match");
      if (reason.includes("Beschikbaarheid match")) add("Beschikbaarheid");
      if (reason.includes("Regio match") || reason.includes("Plaats match")) add("Regio match");
      if (reason.includes("Tarief past") || reason.includes("Tarief indicatie")) add("Budget match");
      if (reason.includes("Beoordeling")) add("Beoordeling");
    }

    // Fallback: keep it marketplace-friendly even if scoring reasons are sparse.
    if (tags.size === 0) {
      if (match.job.city) add("Regio match");
      if (match.score >= 70) add("Zorgtype match");
    }

    const ordered = [
      "Zorgtype match",
      "Regio match",
      "Vaardigheden match",
      "Beschikbaarheid",
      "Budget match",
      "Beoordeling",
    ].filter((t) => tags.has(t));

    return ordered.slice(0, 3);
  }

  function buildMatchExplanation(match: JobMatch): string {
    if (match.narrativeSummary) return match.narrativeSummary;
    if (match.summary) return match.summary;
    return "Past bij jouw voorkeuren.";
  }

  function buildGlobalMatchInsights(matches: JobMatch[]): string[] {
    const insights = new Set<string>();

    for (const m of matches) {
      for (const reason of m.reasons) {
        if (reason.includes("Type zorg match")) insights.add("Zorgtype match");
        if (reason.includes("Regio match") || reason.includes("Plaats match")) insights.add("Regio match");
        if (reason.includes("Vaardigheden match")) insights.add("Vaardigheden match");
        if (reason.includes("Tarief past") || reason.includes("Tarief indicatie")) insights.add("Budget match");
        if (reason.includes("Beoordeling")) insights.add("Beoordeling");
        if (reason.includes("Beschikbaarheid match")) insights.add("Beschikbaarheid");
      }
    }

    const ordered = ["Zorgtype match", "Regio match", "Budget match", "Vaardigheden match", "Beoordeling", "Beschikbaarheid"].filter((t) =>
      insights.has(t)
    );
    if (ordered.length > 0) return ordered.slice(0, 4);

    // Safe fallback
    return matches.length ? ["Zorgtype match", "Regio match"] : [];
  }

  function formatJobPrice(job: JobMatch["job"]): string {
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
    if (typeof job.hourly_rate === "number") {
      return `€${fmt(job.hourly_rate)} / uur`;
    }
    const min = job.budget_min;
    const max = job.budget_max;
    if (typeof min === "number" && typeof max === "number") return `€${fmt(min)}–€${fmt(max)} / uur`;
    if (typeof min === "number") return `Vanaf €${fmt(min)} / uur`;
    if (typeof max === "number") return `Tot €${fmt(max)} / uur`;
    return "Prijs op aanvraag";
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-none">
      {/* Hero — volle breedte binnen AppLayout main (geen extra max-width cap op dashboard) */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#40ADA8]/18 via-[#40ADA8]/6 to-slate-50 shadow-lg">
        <div className="grid gap-8 p-6 sm:p-8 lg:p-10 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,1fr)]">
          <div className="min-w-0 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#40ADA8] shadow-sm ring-1 ring-[#40ADA8]/10">
              <Star className="h-3.5 w-3.5" />
              SamenConnect Marketplace
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#40ADA8]">Welkom terug, {displayName}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Jouw zorgopdrachten en matches in één overzicht
              </h1>
              <p className="max-w-2xl text-sm sm:text-base leading-7 text-slate-600">
                Beheer opdrachten, berichten en matches alsof je een professionele marketplace runt. Altijd overzicht, altijd
                klaar om te reageren.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/zorenta/jobs/new">
                <Button className="bg-[#40ADA8] text-white shadow-sm hover:bg-[#369e9a]">
                  <PlusCircle className="h-4 w-4" />
                  Plaats opdracht
                </Button>
              </Link>
              <Link href="/zorenta/jobs">
                <Button
                  variant="outline"
                  className="border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <ClipboardList className="h-4 w-4" />
                  Bekijk opdrachten
                </Button>
              </Link>
              {nextBestAction && (
                <Link href={nextBestAction.href} className="text-xs font-medium text-[#40ADA8] underline-offset-4 hover:underline">
                  {nextBestAction.label}
                </Link>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {stats.map((item) => {
              const Icon = item.icon;
              const href = getStatHref(item.label);
              const card = (
                <div
                  className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    href ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#40ADA8]/10 text-[#40ADA8]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
              if (href) {
                return (
                  <Link key={item.label} href={href} className="block">
                    {card}
                  </Link>
                );
              }
              return <div key={item.label}>{card}</div>;
            })}
          </div>
        </div>
      </section>

      {/* Rail pas naast main vanaf min-[1720px] (viewport − sidebar − padding − rail ≈ genoeg voor 3 kaartkolommen). Tot die breedte: gestapeld = volle breedte voor main. */}
      <div className="mt-8 grid w-full min-w-0 grid-cols-1 gap-6 min-[1720px]:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] min-[1720px]:items-start min-[1720px]:gap-8">
        {/* Left column */}
        <div className="min-w-0 space-y-6 lg:space-y-7 min-[1720px]:space-y-8">
          {/* AI recommended jobs */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-5 flex min-w-0 items-center justify-between gap-3 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  Aanbevolen opdrachten voor jou
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Opdrachten die goed aansluiten bij jouw profiel en voorkeuren.
                </p>
              </div>
              <Link href="/zorenta/jobs" className="shrink-0">
                <Button variant="outline" className="border-slate-200 bg-white text-sm">
                  Alle opdrachten
                </Button>
              </Link>
            </div>

            {/* 1 / md:2 / 2xl:3 — xl zou ~960px main na sidebar geven (~320px/kaart); 3 kolommen pas vanaf 2xl (bredere viewport = genoeg main) */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 2xl:grid-cols-3 2xl:gap-6">
              {jobMatches.slice(0, 6).map((m) => (
                <article
                  key={m.job.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <JobListingCover
                    job={{
                      image_urls: m.job.image_urls,
                      image_url: m.job.image_url,
                      cover_image_url: m.job.cover_image_url,
                      photo_url: m.job.photo_url,
                      title: m.job.title,
                      care_type: m.job.care_type,
                    }}
                    className="h-36 w-full shrink-0 border-b border-slate-200/80 sm:h-40 md:h-44 lg:h-[11rem] xl:h-44 2xl:h-48"
                  />
                  <div className="min-w-0 space-y-3 p-4 sm:p-5 sm:space-y-3.5 md:space-y-4 md:p-5 2xl:p-6">
                    <div className="flex min-w-0 items-start justify-between gap-3 md:gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 sm:text-base lg:text-lg lg:leading-snug">
                          {m.job.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 md:text-sm">
                          {m.job.city || "Amsterdam"}
                        </p>
                      </div>
                      <Badge className="shrink-0 rounded-full bg-[#40ADA8] px-3 py-1 text-xs text-white md:px-3.5 md:py-1.5 md:text-sm">
                        Match {Math.round(m.score)}%
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-2.5">
                      {buildMatchTags(m).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 group-hover:bg-slate-200 md:px-3.5 md:text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:gap-3">
                      <p className="min-w-0 text-sm font-semibold text-slate-800 md:text-base">
                        {formatJobPrice(m.job)}
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-2 md:gap-3">
                        <Link href={`/zorenta/jobs/${m.job.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 bg-white text-xs text-slate-700 md:h-9 md:px-4 md:text-sm"
                          >
                            Bekijk
                          </Button>
                        </Link>
                        {m.job.poster_id ? (
                          <StartMessageButton
                            otherUserId={m.job.poster_id}
                            jobId={m.job.id}
                            prefill="Hoi, ik heb interesse in deze opdracht."
                            size="sm"
                            variant="primary"
                            label="Reageer"
                            showIcon={false}
                            className="bg-[#40ADA8] px-3 text-xs text-white hover:bg-[#369e9a] md:h-9 md:px-4 md:text-sm"
                          />
                        ) : (
                          <Link href={`/zorenta/jobs/${m.job.id}`}>
                            <Button
                              size="sm"
                              className="bg-[#40ADA8] px-3 text-xs text-white hover:bg-[#369e9a] md:h-9 md:px-4 md:text-sm"
                            >
                              Reageer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    <p className="break-words text-xs text-slate-500 md:text-sm md:leading-relaxed">
                      {buildMatchExplanation(m)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Why these matches */}
          {jobMatches.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Waarom deze matches?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {buildGlobalMatchInsights(jobMatches).map((insight) => (
                  <span
                    key={insight}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {insight}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Jobs in your region */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-5 flex min-w-0 items-center justify-between gap-3 sm:mb-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  Opdrachten in jouw regio
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Snel overzicht van interessante opdrachten dicht bij jou in de buurt.
                </p>
              </div>
              <Link href="/zorenta/search?type=jobs" className="shrink-0">
                <Button variant="outline" className="border-slate-200 bg-white text-sm">
                  Meer in jouw regio
                </Button>
              </Link>
            </div>

            {/* Zelfde breakpoint-logica als aanbevolen-opdrachten (2xl:3 i.p.v. xl:3 i.v.m. smalle main na sidebar) */}
            <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 2xl:grid-cols-3 2xl:gap-6">
              {jobMatches.slice(0, 6).map((m) => (
                <article
                  key={`${m.job.id}-region`}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <JobListingCover
                    job={{
                      image_urls: m.job.image_urls,
                      image_url: m.job.image_url,
                      cover_image_url: m.job.cover_image_url,
                      photo_url: m.job.photo_url,
                      title: m.job.title,
                      care_type: m.job.care_type,
                    }}
                    className="h-36 w-full shrink-0 border-b border-slate-200/80 sm:h-40 md:h-44 lg:h-[10.5rem] xl:h-44 2xl:h-48"
                  />
                  <div className="min-w-0 space-y-3 p-4 sm:p-5 sm:space-y-3.5 md:space-y-4 md:p-5 2xl:p-6">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 md:text-base lg:text-lg lg:leading-snug">
                        {m.job.title}
                      </h3>
                      <p className="text-xs text-slate-500 md:text-sm">
                        {m.job.city || "Amsterdam"}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-slate-800 md:text-base">
                      {formatJobPrice(m.job)}
                    </p>
                    <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:gap-3">
                      <span className="min-w-0 text-[11px] text-slate-500 md:text-xs">Snelle reactie aanbevolen</span>
                      <div className="flex shrink-0 flex-wrap gap-2 md:gap-3">
                        <Link href={`/zorenta/jobs/${m.job.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-200 bg-white text-xs text-slate-700 md:h-9 md:px-4 md:text-sm"
                          >
                            Bekijk
                          </Button>
                        </Link>
                        {m.job.poster_id ? (
                          <StartMessageButton
                            otherUserId={m.job.poster_id}
                            jobId={m.job.id}
                            prefill="Hoi, ik heb interesse in deze opdracht."
                            size="sm"
                            variant="primary"
                            label="Snel reageren"
                            showIcon={false}
                            className="bg-[#40ADA8] px-3 text-xs text-white hover:bg-[#369e9a] md:h-9 md:px-4 md:text-sm"
                          />
                        ) : (
                          <Link href={`/zorenta/jobs/${m.job.id}`}>
                            <Button
                              size="sm"
                              className="bg-[#40ADA8] px-3 text-xs text-white hover:bg-[#369e9a] md:h-9 md:px-4 md:text-sm"
                            >
                              Snel reageren
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="min-w-0 space-y-6 min-[1720px]:space-y-5">
          {/* Standaard p-6; naast main iets compacter */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-[1720px]:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Recente activiteit</h3>
              <Badge variant="secondary" className="rounded-full bg-slate-100 text-xs text-slate-700">
                Live
              </Badge>
            </div>
            <div className="space-y-3">
              <Link
                href="/zorenta/berichten"
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-[#40ADA8]/30 hover:bg-[#40ADA8]/5"
              >
                <div className="mt-0.5 rounded-full bg-[#40ADA8]/10 p-2 text-[#40ADA8]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">Nieuwe berichten</p>
                  <p className="truncate text-xs text-slate-500">
                    Bekijk de laatste gesprekken met zorgverleners en opdrachtgevers.
                  </p>
                </div>
              </Link>
              <Link
                href="/zorenta/search"
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-[#40ADA8]/30 hover:bg-[#40ADA8]/5"
              >
                <div className="mt-0.5 rounded-full bg-[#40ADA8]/10 p-2 text-[#40ADA8]">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">Nieuwe matches</p>
                  <p className="truncate text-xs text-slate-500">
                    Ontdek zorgverleners of opdrachten die goed aansluiten bij jouw profiel.
                  </p>
                </div>
              </Link>
              <Link
                href="/zorenta/applications"
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-[#40ADA8]/30 hover:bg-[#40ADA8]/5"
              >
                <div className="mt-0.5 rounded-full bg-[#40ADA8]/10 p-2 text-[#40ADA8]">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">Recente matches</p>
                  <p className="truncate text-xs text-slate-500">
                    Volg de status van je nieuwste matches.
                  </p>
                </div>
              </Link>
            </div>
          </section>

          {/* Profile progress */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-[1720px]:p-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">Profiel compleetheid</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">
                  {progressPct}% compleet
                </p>
              </div>
              <Badge className="shrink-0 rounded-full bg-[#40ADA8] px-3 py-1 text-xs text-white">
                {progressPct >= 80 ? "Goed bezig" : "Nog even bijwerken"}
              </Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-[#40ADA8]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <Link href={profileEditHref}>
              <Button className="mt-5 w-full bg-[#40ADA8] text-white hover:bg-[#369e9a]">
                Profiel verbeteren
              </Button>
            </Link>
          </section>

          {/* AI Job Finder */}
          <section className="relative overflow-hidden rounded-3xl border border-[#40ADA8]/25 bg-gradient-to-br from-[#40ADA8]/12 via-slate-50 to-white p-6 shadow-md min-[1720px]:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#40ADA8]/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 right-4 h-28 w-28 rounded-full bg-[#40ADA8]/10 blur-2xl" />
            <div className="relative space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#40ADA8] ring-1 ring-[#40ADA8]/30">
                <Sparkles className="h-3.5 w-3.5" />
                AI Opdracht Finder
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                Laat AI automatisch passende opdrachten vinden
              </h3>
              <p className="text-sm text-slate-600">
                Onze AI zoekt op dit moment binnen SamenConnect en stelt een persoonlijke lijst met passende opdrachten
                voor je samen. In een volgende stap worden ook externe bronnen toegevoegd.
              </p>
              <Button className="mt-2 bg-[#40ADA8] text-white shadow-sm hover:bg-[#369e9a]">
                Start AI zoeken
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
