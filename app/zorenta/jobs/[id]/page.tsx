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
    if (!token) return;
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
    }
  }

  if (loading || !job) {
    return <ZorentaPageSkeleton />;
  }

  const isPoster = me?.profile?.id === job.poster_id;
  const canApply =
    me?.profile?.role === "caregiver" && !isPoster && job.status === "open" && !alreadyApplied;

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
        backLabel="Vacatures"
        actions={<Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status === "open" ? "Open" : job.status}</Badge>}
      />

      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <p className="whitespace-pre-wrap text-slate-700">{job.description || "—"}</p>
          <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
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

      {isPoster && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/zorenta/jobs/${id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Bewerken
            </Button>
          </Link>
          <Link href="/zorenta/applications">
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              Sollicitaties bekijken
            </Button>
          </Link>
        </div>
      )}

      {canApply && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base">Solliciteren op deze vacature</CardTitle>
            <p className="text-sm text-slate-500">Voeg een korte motivatie toe (optioneel).</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Textarea
              placeholder="Bericht / motivatie (optioneel)"
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
            <Button onClick={handleApply} disabled={applying}>
              {applying ? "Versturen…" : "Solliciteer nu"}
            </Button>
          </CardContent>
        </Card>
      )}

      {alreadyApplied && !isPoster && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="py-4">
            <p className="text-sm text-slate-600">
              Je hebt al gesolliciteerd op deze vacature.{" "}
              <Link
                href="/zorenta/applications"
                className="font-medium text-emerald-600 hover:underline"
              >
                Bekijk sollicitaties
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </ZorentaPageContainer>
  );
}
