"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Badge } from "@/components/ui/badge";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { JobMatchCard } from "@/components/zorenta/job-match-card";
import { BestMatchHighlight } from "@/components/match/BestMatchHighlight";
import {
  Briefcase,
  FileText,
  MessageSquare,
  Search,
  ClipboardList,
  PlusCircle,
  Bell,
  ChevronRight,
} from "lucide-react";

type JobMatch = {
  job: { id: string; title: string; city?: string | null; care_type?: string | null; status?: string };
  score: number;
  reasons: string[];
  summary: string;
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
      const [meRes, dashRes, matchRes] = await Promise.all([
        fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
        fetch("/api/zorenta/dashboard", { headers: zorentaHeaders(token) }),
        fetch("/api/zorenta/matching/jobs-for-me", { headers: zorentaHeaders(token) }),
      ]);
      const meData = await meRes.json().catch(() => ({}));
      const dashData = await dashRes.json().catch(() => ({}));
      const matchData = await matchRes.json().catch(() => ({}));
      if (!cancelled) {
        setMe(meData);
        if (meRes.ok && meData.profile === null) {
          router.replace("/zorenta/register");
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

  if (loading || !me?.profile) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 md:px-8 lg:py-10">
        <div className="mb-4 inline-flex rounded-md bg-black px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
          DASHBOARD PAGE
        </div>
        <ZorentaPageSkeleton />
      </div>
    );
  }

  const profile = me.profile;
  const roleLabel = profile.role === "caregiver" ? "Zorgverlener" : profile.role === "client" ? "Client" : "Organisatie";

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
  const totalJobs = (dashboard?.myJobs ?? []).length;
  const applicationsCount = dashboard?.applicationsCount ?? 0;
  const intakesCount = dashboard?.intakesCount ?? 0;
  const conversationsCount = dashboard?.conversationsCount ?? 0;
  const unreadNotifCount = dashboard?.unreadNotifications?.length ?? 0;

  const progressSteps =
    profile.role === "caregiver"
      ? [
          { done: !!hasRoleProfile, label: "Profiel compleet" },
          { done: jobMatches.length > 0, label: "Beste matches bekeken" },
          { done: applicationsCount > 0, label: "Gesolliciteerd op vacature" },
          { done: conversationsCount > 0, label: "Eerste bericht gestuurd" },
        ]
      : [
          { done: !!hasRoleProfile, label: "Profiel compleet" },
          { done: intakesCount > 0, label: "Intake gestart" },
          { done: totalJobs > 0, label: "Eerste vacature geplaatst" },
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
          ? { label: "Bekijk vacatures", href: "/zorenta/jobs" }
          : applicationsCount === 0
            ? { label: "Solliciteer op een vacature", href: "/zorenta/jobs" }
            : conversationsCount === 0
              ? { label: "Stuur je eerste bericht", href: "/zorenta/applications" }
              : null
      : !hasRoleProfile
        ? { label: "Vul je profiel in", href: profileEditHref }
        : intakesCount === 0 && totalJobs === 0
          ? { label: "Start zorgvraag intake", href: "/zorenta/intake" }
          : totalJobs === 0
            ? { label: "Plaats je eerste vacature", href: "/zorenta/jobs/new" }
            : (dashboard?.recentApplications?.length ?? 0) === 0
              ? { label: "Bekijk matches", href: "/zorenta/jobs" }
              : conversationsCount === 0
                ? { label: "Stuur je eerste bericht", href: "/zorenta/applications" }
                : null;

  const statCards = [
    {
      title: "Actieve vacatures",
      value: profile.role === "caregiver" ? (dashboard?.openJobsCount ?? 0) : activeJobs,
      subtitle: profile.role === "caregiver" ? "Open vacatures" : `van ${totalJobs} totaal`,
      icon: Briefcase,
      href: "/zorenta/jobs",
    },
    {
      title: "Sollicitaties",
      value: applicationsCount,
      subtitle: "Totaal",
      icon: FileText,
      href: "/zorenta/applications",
    },
    {
      title: "Berichten",
      value: "—",
      subtitle: "Gesprekken",
      icon: MessageSquare,
      href: "/zorenta/messages",
    },
    {
      title: "Notificaties",
      value: unreadNotifCount,
      subtitle: "Ongelezen",
      icon: Bell,
      href: "/zorenta/notifications",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 md:px-8 lg:py-10">
      <div className="mb-4 inline-flex rounded-md bg-black px-3 py-1 text-sm font-bold uppercase tracking-wide text-white">
        DASHBOARD PAGE
      </div>
      {/* 1. Hero card — groot wit blok */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-600">Welkom, {displayName}</p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              SamenConnect Dashboard
            </h1>
            <p className="max-w-2xl text-base text-slate-600">
              Beheer zorgvragen, vacatures en gesprekken vanuit één plek.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(profile.role === "client" || profile.role === "organization") && (
              <>
                <Link
                  href="/zorenta/jobs/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <PlusCircle className="h-4 w-4" />
                  Nieuwe vacature
                </Link>
                <Link
                  href="/zorenta/intake"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ClipboardList className="h-4 w-4" />
                  Zorgvraag intake
                </Link>
              </>
            )}
            {profile.role === "caregiver" && nextBestAction && (
              <Link
                href={nextBestAction.href}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {nextBestAction.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. Veiligheidsblok */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Veilig berichten</p>
        <p className="mt-1">
          Berichten blijven binnen SamenConnect. Deel geen betaalgegevens of persoonsgegevens buiten het platform.
        </p>
      </div>

      {/* 3. Stat grid — 4 witte cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{item.title}</span>
                <Icon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
              {item.subtitle && <p className="mt-1 text-sm text-slate-500">{item.subtitle}</p>}
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Bekijken
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* 4. Twee-koloms: Voortgang + Snelle acties */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Voortgang-card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Voortgang</h2>
          <p className="mt-1 text-sm text-slate-500">{progressPct}% voltooid</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-700">
            {progressSteps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                {s.done ? (
                  <span className="text-emerald-600">✔</span>
                ) : (
                  <span className="text-slate-300">○</span>
                )}
                <span className={s.done ? "font-medium text-slate-800" : "text-slate-500"}>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Snelle acties-card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Snelle acties</h2>
          <p className="mt-1 text-sm text-slate-500">Snel naar de belangrijkste onderdelen.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/zorenta/search"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Zorgverleners zoeken
            </Link>
            <Link
              href="/zorenta/messages"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Berichten
            </Link>
            <Link
              href="/zorenta/jobs/new"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Nieuwe vacature
            </Link>
            <Link
              href="/zorenta/intake"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Zorgvraag intake
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Role-specifieke content in witte cards */}
      {dashboard?.role === "caregiver" && jobMatches.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Beste matches</h2>
          <p className="mt-1 text-sm text-slate-500">Vacatures die het beste bij je profiel passen</p>
          <div className="mt-4 space-y-3">
            {jobMatches.slice(0, 5).map((m, idx) =>
              idx === 0 ? (
                <BestMatchHighlight key={m.job.id}>
                  <JobMatchCard match={m} />
                </BestMatchHighlight>
              ) : (
                <JobMatchCard key={m.job.id} match={m} />
              )
            )}
          </div>
          <Link
            href="/zorenta/jobs"
            className="mt-4 inline-flex w-full justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Alle vacatures bekijken
          </Link>
        </div>
      )}

      {dashboard?.role === "caregiver" && dashboard.recentApplications && dashboard.recentApplications.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recente sollicitaties</h2>
          <div className="mt-4 space-y-3">
            {dashboard.recentApplications.slice(0, 3).map((a) => {
              const title = "job_title" in a ? a.job_title : (a as { care_jobs?: { title?: string } }).care_jobs?.title;
              return (
                <Link
                  key={a.id}
                  href="/zorenta/applications"
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-sm transition-colors hover:bg-slate-100/80"
                >
                  <Badge variant="outline" className="shrink-0">
                    {title ?? "—"}
                  </Badge>
                  <span className="truncate text-slate-600">{a.status}</span>
                </Link>
              );
            })}
          </div>
          <Link
            href="/zorenta/applications"
            className="mt-3 inline-flex w-full justify-center text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Alle sollicitaties
          </Link>
        </div>
      )}

      {(dashboard?.role === "client" || dashboard?.role === "organization") && (dashboard.myJobs ?? []).length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mijn vacatures</h2>
          <p className="mt-1 text-sm text-slate-500">{dashboard.myJobs!.length} vacature(s)</p>
          <div className="mt-4 space-y-3">
            {dashboard.myJobs!.slice(0, 3).map((j) => (
              <Link
                key={j.id}
                href={`/zorenta/jobs/${j.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-sm transition-colors hover:bg-slate-100/80"
              >
                <Badge variant={j.status === "open" ? "default" : "secondary"} className="shrink-0">
                  {j.status}
                </Badge>
                <span className="truncate font-medium text-slate-900">{j.title}</span>
                {dashboard.applicationsByJob?.[j.id] != null && (
                  <span className="ml-auto text-xs text-slate-500">
                    {dashboard.applicationsByJob[j.id]} sollicitanten
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/zorenta/jobs"
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Alle vacatures
            </Link>
            <Link
              href="/zorenta/jobs/new"
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-700"
            >
              Nieuwe vacature
            </Link>
          </div>
        </div>
      )}

      {((dashboard?.role === "client" || dashboard?.role === "organization") && (dashboard.myJobs ?? []).length === 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mijn vacatures</h2>
          <p className="mt-1 text-sm text-slate-500">Nog geen vacatures geplaatst</p>
          <Link
            href="/zorenta/jobs/new"
            className="mt-4 inline-flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Plaats je eerste vacature
          </Link>
        </div>
      )}
    </div>
  );
}
