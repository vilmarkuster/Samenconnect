"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaStatCard } from "@/components/zorenta/stat-card";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaInfoCard } from "@/components/zorenta/info-card";
import { JobMatchCard } from "@/components/zorenta/job-match-card";
import { OnboardingProgress } from "@/components/zorenta/onboarding-progress";
import { BestMatchHighlight } from "@/components/match/BestMatchHighlight";
import { Briefcase, FileText, MessageSquare, Search, User, Shield, ClipboardList, PlusCircle, ChevronRight } from "lucide-react";

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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/zorenta/login");
      return;
    }
    if (!isAuthenticated) return;

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
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || loading || !me?.profile) {
    return <ZorentaPageSkeleton />;
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
  const progressSteps =
    profile.role === "caregiver"
      ? [
          { done: !!hasRoleProfile, label: "Profiel compleet" },
          { done: (jobMatches.length > 0), label: "Beste matches bekeken" },
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
      ? Math.round(
          (progressSteps.filter((s) => s.done).length / progressSteps.length) * 100
        )
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

  return (
    <PageContainer maxWidth="wide" className="space-y-6 sm:space-y-8">
      {/* Welcome card + next action */}
      <Card className="overflow-hidden border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
        <CardContent className="py-6">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Welkom, {displayName}
          </h1>
          <p className="mt-1 text-slate-600">
            {profile.role === "caregiver"
              ? "Bekijk vacatures en matches die bij je passen."
              : "Beheer je zorgvragen en vind de juiste zorgverleners."}
          </p>
          {nextBestAction && progressPct < 100 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href={nextBestAction.href}>
                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  {nextBestAction.label}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role-specific nudges */}
      {progressPct < 100 && (
        <>
          {profile.role === "caregiver" && (
            <Card className="border-amber-100 bg-amber-50/50">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-amber-900">
                  {!hasRoleProfile
                    ? "Je profiel is nog niet compleet. Vul je skills en ervaring in voor betere matches."
                    : jobMatches.length > 0 && applicationsCount === 0
                      ? `Je hebt ${jobMatches.length} passende vacature(s). Solliciteer om in contact te komen.`
                      : applicationsCount > 0 && conversationsCount === 0
                        ? "Verhoog je kans: stuur een bericht na je sollicitatie of wacht op reactie."
                        : jobMatches.length === 0
                          ? "Vul je skills aan voor meer matches. Bekijk ook alle open vacatures."
                          : ""}
                </p>
                {!hasRoleProfile && (
                  <Link href={profileEditHref} className="shrink-0">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Profiel invullen</Button>
                  </Link>
                )}
                {hasRoleProfile && (jobMatches.length > 0 || applicationsCount === 0) && (
                  <Link href="/zorenta/jobs" className="shrink-0">
                    <Button size="sm" variant="outline">Bekijk vacatures</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
          {(profile.role === "client" || profile.role === "organization") && (
            <Card className="border-amber-100 bg-amber-50/50">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-amber-900">
                  {!hasRoleProfile
                    ? "Vul je zorgprofiel in zodat we je betere matches kunnen tonen."
                    : intakesCount === 0 && totalJobs === 0
                      ? "Je profiel is compleet. Start je zorgvraag intake of plaats direct een vacature."
                      : intakesCount > 0 && totalJobs === 0
                        ? "Je intake is klaar. Bekijk je beste matches of zet je intake om in een vacature."
                        : totalJobs > 0 && (dashboard?.recentApplications?.length ?? 0) === 0
                          ? "Nog geen sollicitaties? Bekijk je vacature of nodig zorgverleners uit via zoeken."
                          : ""}
                </p>
                {!hasRoleProfile && (
                  <Link href={profileEditHref} className="shrink-0">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Profiel invullen</Button>
                  </Link>
                )}
                {hasRoleProfile && intakesCount === 0 && totalJobs === 0 && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link href="/zorenta/intake">
                      <Button size="sm">Start intake</Button>
                    </Link>
                    <Link href="/zorenta/jobs/new">
                      <Button size="sm" variant="outline">Vacature plaatsen</Button>
                    </Link>
                  </div>
                )}
                {hasRoleProfile && totalJobs > 0 && (
                  <Link href="/zorenta/jobs" className="shrink-0">
                    <Button size="sm" variant="outline">Bekijk vacatures</Button>
                  </Link>
                )}
                {hasRoleProfile && intakesCount > 0 && totalJobs === 0 && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link href="/zorenta/intake">
                      <Button size="sm" variant="outline">Intake bekijken</Button>
                    </Link>
                    <Link href="/zorenta/jobs/new">
                      <Button size="sm">Vacature plaatsen</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Trust & safety */}
      <ZorentaInfoCard icon={Shield} title="Veilig berichten" variant="success">
        Berichten blijven binnen Zorenta. Deel geen betaalgegevens of persoonsgegevens buiten het platform.
      </ZorentaInfoCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Progress card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Voortgang</CardTitle>
            <p className="text-sm font-medium text-slate-500">{progressPct}%</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-2">
              {progressSteps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {s.done ? (
                    <span className="text-emerald-600">✔</span>
                  ) : (
                    <span className="text-slate-300">○</span>
                  )}
                  <span className={s.done ? "text-slate-700" : "text-slate-500"}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Quick actions card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Snelle acties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(profile.role === "client" || profile.role === "organization") && (
              <>
                <Link href="/zorenta/jobs/new">
                  <Button size="sm" className="gap-1.5">
                    <PlusCircle className="h-4 w-4" />
                    Nieuwe vacature
                  </Button>
                </Link>
                <Link href="/zorenta/intake">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    Zorgvraag intake
                  </Button>
                </Link>
              </>
            )}
            <Link href="/zorenta/search">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Search className="h-4 w-4" />
                Zorgverleners zoeken
              </Button>
            </Link>
            <Link href="/zorenta/messages">
              <Button variant="outline" size="sm" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Berichten
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <ZorentaStatCard
          title="Actieve vacatures"
          value={profile.role === "caregiver" ? (dashboard?.openJobsCount ?? 0) : activeJobs}
          subtitle={profile.role === "caregiver" ? "Open vacatures" : `van ${totalJobs} totaal`}
          icon={Briefcase}
          href="/zorenta/jobs"
          actionLabel="Bekijken"
        />
        <ZorentaStatCard
          title="Sollicitaties"
          value={applicationsCount}
          subtitle="Totaal"
          icon={FileText}
          href="/zorenta/applications"
          actionLabel="Bekijken"
        />
        <ZorentaStatCard
          title="Berichten"
          value="—"
          subtitle="Gesprekken"
          icon={MessageSquare}
          href="/zorenta/messages"
          actionLabel="Openen"
        />
        {dashboard?.unreadNotifications && dashboard.unreadNotifications.length > 0 && (
          <ZorentaStatCard
            title="Notificaties"
            value={dashboard.unreadNotifications.length}
            subtitle="Ongelezen"
            href="/zorenta/notifications"
            actionLabel="Bekijken"
          />
        )}

        <OnboardingProgress
          role={profile.role}
          hasRoleProfile={!!hasRoleProfile}
          openJobsCount={dashboard?.openJobsCount}
          applicationsCount={dashboard?.applicationsCount ?? 0}
          myJobsCount={dashboard?.myJobs?.length ?? 0}
          intakesCount={dashboard?.intakesCount ?? 0}
          conversationsCount={dashboard?.conversationsCount ?? 0}
          jobMatchesCount={jobMatches.length}
          recentApplicationsCount={dashboard?.recentApplications?.length ?? 0}
        />
        <ZorentaStatCard
          title="Mijn profiel"
          value={roleLabel}
          subtitle="Rol in het platform"
          icon={User}
          href={profileEditHref}
          actionLabel="Profiel bewerken"
        />

        {dashboard?.role === "caregiver" && (
          <>
            {jobMatches.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Beste matches</CardTitle>
                  <p className="text-sm text-slate-500">Vacatures die het beste bij je profiel passen</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {jobMatches.slice(0, 5).map((m, idx) =>
                    idx === 0 ? (
                      <BestMatchHighlight key={m.job.id}>
                        <JobMatchCard match={m} />
                      </BestMatchHighlight>
                    ) : (
                      <JobMatchCard key={m.job.id} match={m} />
                    )
                  )}
                  <Link href="/zorenta/jobs">
                    <Button variant="outline" size="sm" className="w-full">
                      Alle vacatures bekijken
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {dashboard.recentApplications && dashboard.recentApplications.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recente sollicitaties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                  ); })}
                  <Link href="/zorenta/applications">
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Alle sollicitaties
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {(dashboard?.role === "client" || dashboard?.role === "organization") && (
          <>
            {(dashboard.myJobs ?? []).length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mijn vacatures</CardTitle>
                  <p className="text-sm text-slate-500">{dashboard.myJobs!.length} vacature(s)</p>
                </CardHeader>
                <CardContent className="space-y-3">
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
                  <div className="flex gap-2">
                    <Link href="/zorenta/jobs" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full justify-center">
                        Alle vacatures
                      </Button>
                    </Link>
                    <Link href="/zorenta/jobs/new" className="flex-1">
                      <Button size="sm" className="w-full justify-center">
                        Nieuwe vacature
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mijn vacatures</CardTitle>
                  <p className="text-sm text-slate-500">Nog geen vacatures geplaatst</p>
                </CardHeader>
                <CardContent>
                  <Link href="/zorenta/jobs/new">
                    <Button size="sm" className="w-full">Plaats je eerste vacature</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {((dashboard.recentApplications ?? []) as { applicant_id?: string; job_title?: string }[]).some((a) => "applicant_id" in a && a.applicant_id) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sollicitaties</CardTitle>
                  <p className="text-sm text-slate-500">Recente sollicitaties op je vacatures</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {((dashboard.recentApplications ?? []) as { id: string; job_id: string; applicant_id: string; status: string; job_title: string | null; applicant_display_name: string | null }[])
                    .filter((a) => "applicant_id" in a)
                    .slice(0, 5)
                    .map((app) => (
                      <div
                        key={app.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{app.job_title ?? "Vacature"}</p>
                          <p className="text-slate-600">
                            <Link href={`/zorenta/caregivers/${app.applicant_id}`} className="hover:text-primary-600 hover:underline">
                              {app.applicant_display_name ?? "Zorgverlener"}
                            </Link>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={app.status === "accepted" ? "success" : app.status === "rejected" ? "secondary" : "outline"}>
                            {app.status === "accepted" ? "Geaccepteerd" : app.status === "rejected" ? "Afgewezen" : "In afwachting"}
                          </Badge>
                          <Link href={`/zorenta/applications?job_id=${app.job_id}`}>
                            <Button variant="ghost" size="sm">Bekijk</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  <Link href="/zorenta/applications">
                    <Button variant="ghost" size="sm" className="w-full justify-center">
                      Alle sollicitaties
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {dashboard?.unreadNotifications && dashboard.unreadNotifications.length > 0 && (
          <ZorentaStatCard
            title="Notificaties"
            value={dashboard.unreadNotifications.length}
            subtitle="Ongelezen"
            href="/zorenta/notifications"
            actionLabel="Bekijken"
          />
        )}
      </div>
    </PageContainer>
  );
}
