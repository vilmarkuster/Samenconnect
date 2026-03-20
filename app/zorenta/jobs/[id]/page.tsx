"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaSectionHeader } from "@/components/zorenta/section-header";
import { CaregiverMatchCard } from "@/components/zorenta/caregiver-match-card";
import { MapPin, Calendar, Euro, Building2, Clock, Pencil, FileText } from "lucide-react";

type CaregiverMatch = {
  caregiver: { id: string; profile_id: string; headline?: string | null; display_name?: string | null };
  score: number;
  reasons: string[];
  summary: string;
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  care_type: string | null;
  schedule: string | null;
  availability: string | null;
  budget_min: number | null;
  budget_max: number | null;
  hourly_rate: number | null;
  status: string;
  poster_id: string;
  poster_type: string;
  created_at: string;
};

type Me = { profile: { id: string; role: string } };

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caregiverMatches, setCaregiverMatches] = useState<CaregiverMatch[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const showCreatedSuccess = searchParams.get("created") === "1";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      const headers = token ? zorentaHeaders(token) : {};
      const [jobRes, meRes, appsRes] = await Promise.all([
        fetch(`/api/zorenta/jobs/${id}`, { headers }),
        fetch("/api/zorenta/me", { headers }),
        fetch("/api/zorenta/applications", { headers }),
      ]);
      const jobData = await jobRes.json().catch(() => ({}));
      const meData = await meRes.json().catch(() => ({}));
      const appsData = await appsRes.json().catch(() => ({}));
      if (!cancelled) {
        if (jobData.id) setJob(jobData);
        if (meData.profile) setMe(meData);
        const applications = appsData.applications ?? [];
        const applied = applications.some((a: { job_id: string }) => a.job_id === id);
        setAlreadyApplied(applied);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id || !job || !me?.profile || me.profile.id !== job.poster_id) return;
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch(`/api/zorenta/matching/caregivers-for-job?job_id=${id}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d.matches)) setCaregiverMatches(d.matches);
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [id, job, me?.profile]);

  async function handleApply() {
    const token = await getZorentaAccessToken();
    if (!token) {
      setApplyError("Je sessie is verlopen. Log opnieuw in om te solliciteren.");
      return;
    }
    setApplyError(null);
    setApplying(true);
    const res = await fetch("/api/zorenta/applications", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ job_id: id, message: applyMessage.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setApplying(false);
    if (res.ok) {
      trackZorentaEvent("application_sent", { job_id: id });
      setAlreadyApplied(true);
      router.push("/zorenta/applications");
      return;
    }
    setApplyError(typeof data?.error === "string" ? data.error : "Solliciteren is niet gelukt. Probeer het opnieuw.");
  }

  if (loading || !job) {
    return <ZorentaPageSkeleton />;
  }

  const isPoster = me?.profile?.id === job.poster_id;
  const roleAllows = me?.profile?.role === "caregiver";
  const statusAllows = job.status === "open";
  const canApply = roleAllows && !isPoster && statusAllows && !alreadyApplied;

  const postedAt =
    job.created_at ? new Date(job.created_at).toLocaleDateString("nl-NL", { year: "numeric", month: "short", day: "2-digit" }) : null;

  const jobTags: string[] = [];
  if (job.poster_type === "client") jobTags.push("PGB");
  const availabilityLc = (job.availability ?? "").toLowerCase();
  const scheduleLc = (job.schedule ?? "").toLowerCase();
  if (availabilityLc.includes("flexibel")) jobTags.push("flexibel");
  if (
    availabilityLc.includes("fulltime") ||
    availabilityLc.includes("parttime") ||
    scheduleLc.includes("langdurig")
  )
    jobTags.push("langdurig");
  if (jobTags.length === 0) jobTags.push("in overleg");

  function scrollToApplyForm() {
    const el = document.getElementById("apply-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <ZorentaPageContainer maxWidth="narrow" className="space-y-6">
      {showCreatedSuccess && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Vacature is geplaatst. Zorgverleners kunnen nu solliciteren.
        </div>
      )}
      <ZorentaPageHeader
        title={job.title}
        backHref="/zorenta/jobs"
        backLabel="Terug naar vacatures"
        actions={<Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status === "open" ? "Open" : job.status}</Badge>}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                {jobTags.map((t) => (
                  <Badge key={t} variant="secondary" className="rounded-full bg-slate-50">
                    {t}
                  </Badge>
                ))}
                {job.care_type && (
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white">
                    {job.care_type}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Omschrijving</p>
                <p className="whitespace-pre-wrap text-slate-700">
                  {job.description?.trim()
                    ? job.description
                    : "Er is nog geen beschrijving toegevoegd. Reageer om meer informatie te vragen."}
                </p>
              </div>

              <dl className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                {(job.city || job.region || job.country) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Locatie</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        {[job.city, job.region, job.country].filter(Boolean).join(", ") || "—"}
                      </dd>
                    </div>
                  </div>
                )}
                {job.care_type && (
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Type zorg</dt>
                      <dd className="text-sm font-medium text-slate-900">{job.care_type}</dd>
                    </div>
                  </div>
                )}
                {job.availability && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Beschikbaarheid</dt>
                      <dd className="text-sm font-medium text-slate-900">{job.availability}</dd>
                    </div>
                  </div>
                )}
                {job.schedule && (
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Roster</dt>
                      <dd className="text-sm font-medium text-slate-900">{job.schedule}</dd>
                    </div>
                  </div>
                )}
                {job.hourly_rate != null && (
                  <div className="flex items-start gap-2">
                    <Euro className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Uurtarief</dt>
                      <dd className="text-sm font-medium text-slate-900">€{job.hourly_rate}/uur</dd>
                    </div>
                  </div>
                )}
                {(job.budget_min != null || job.budget_max != null) && (
                  <div className="flex items-start gap-2">
                    <Euro className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Budget</dt>
                      <dd className="text-sm font-medium text-slate-900">
                        €{job.budget_min ?? "—"} – €{job.budget_max ?? "—"}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">Vacature status</p>
                  <p className="text-sm text-slate-600">
                    {job.status === "open" ? "Open" : job.status === "closed" ? "Gesloten" : job.status}
                  </p>
                </div>
                {postedAt ? (
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white">
                    Geplaatst op {postedAt}
                  </Badge>
                ) : null}
              </div>

              {isPoster ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Je plaatst deze vacature.</p>
                  <div className="flex flex-col gap-2">
                    <Link href={`/zorenta/jobs/${id}/edit`}>
                      <Button variant="outline" className="w-full gap-2">
                        <Pencil className="h-4 w-4" />
                        Bewerken
                      </Button>
                    </Link>
                    <Link href="/zorenta/applications">
                      <Button className="w-full gap-2 bg-[#40ADA8] text-white hover:bg-[#369e9a]">
                        <FileText className="h-4 w-4" />
                        Sollicitaties bekijken
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : !me?.profile ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Je profiel kon niet worden geladen.</p>
                  <p className="text-xs text-slate-500">
                    Rond je registratie/profiel af om te kunnen reageren.
                  </p>
                </div>
              ) : !roleAllows ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Alleen zorgverleners kunnen reageren op opdrachten.</p>
                  <p className="text-xs text-slate-500">
                    Huidige rol: {me?.profile?.role ?? "onbekend"}.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/zorenta/jobs")}
                  >
                    Bekijk vacatures
                  </Button>
                </div>
              ) : !statusAllows ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Deze vacature is niet meer open ({job.status}).
                  </p>
                </div>
              ) : canApply ? (
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                    onClick={scrollToApplyForm}
                  >
                    Reageer op deze opdracht
                  </Button>
                  <p className="text-xs text-slate-500">Voeg een korte motivatie toe (optioneel).</p>
                </div>
              ) : alreadyApplied ? (
                <div className="space-y-3">
                  <Button size="lg" className="w-full" onClick={() => router.push("/zorenta/applications")}>
                    Bekijk sollicitaties
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Je kunt nog niet reageren op deze opdracht.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isPoster && caregiverMatches.length > 0 && (
        <section>
          <ZorentaSectionHeader
            title="Beste matches"
            description="Zorgverleners die goed bij deze vacature passen"
          />
          <div className="mt-4 space-y-3">
            {caregiverMatches.slice(0, 5).map((m) => (
              <CaregiverMatchCard key={m.caregiver.profile_id} match={m} />
            ))}
          </div>
        </section>
      )}

      {canApply && (
        <Card className="overflow-hidden">
          <div id="apply-section">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base">Solliciteren op deze opdracht</CardTitle>
              <p className="text-sm text-slate-500">
                Voeg een korte motivatie toe (optioneel).
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {applyError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {applyError}
                </p>
              )}
              <Textarea
                placeholder="Bericht / motivatie (optioneel)"
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={3}
                className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
              <Button
                onClick={handleApply}
                disabled={applying}
                size="lg"
                className="w-full bg-[#40ADA8] text-white hover:bg-[#369e9a]"
              >
                {applying ? "Versturen…" : "Solliciteer nu"}
              </Button>
            </CardContent>
          </div>
        </Card>
      )}
    </ZorentaPageContainer>
  );
}
