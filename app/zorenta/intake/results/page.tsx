"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaSectionHeader } from "@/components/zorenta/section-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { CaregiverCard } from "@/components/caregiver/CaregiverCard";
import { FileText, User, Briefcase, Search } from "lucide-react";

type Intake = {
  id: string;
  care_type?: string | null;
  care_frequency?: string | null;
  preferred_schedule?: string | null;
  preferred_city?: string | null;
  skills_required?: string[] | null;
  budget_min?: number | null;
  budget_max?: number | null;
  urgency?: string | null;
};

type Match = {
  caregiver: {
    id: string;
    profile_id: string;
    headline?: string | null;
    city?: string | null;
    hourly_rate?: number | null;
    experience_years?: number | null;
    display_name?: string | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

function IntakeResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intake_id");
  const [intake, setIntake] = useState<Intake | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingJob, setCreatingJob] = useState(false);

  useEffect(() => {
    if (!intakeId) {
      router.replace("/zorenta/intake");
      return;
    }
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        router.replace("/zorenta/login");
        return;
      }
      fetch(`/api/zorenta/matching/caregivers-for-intake?intake_id=${intakeId}`, {
        headers: zorentaHeaders(token),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) {
            setIntake(d.intake ?? null);
            setMatches(d.matches ?? []);
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [intakeId, router]);

  const createJobFromIntake = async () => {
    if (!intakeId || !intake) return;
    const token = await getZorentaAccessToken();
    if (!token) return;
    setCreatingJob(true);
    const title = intake.care_type
      ? `Zorgvraag: ${intake.care_type}${intake.preferred_city ? ` in ${intake.preferred_city}` : ""}`
      : "Zorgvraag uit intake";
    const res = await fetch("/api/zorenta/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...zorentaHeaders(token) },
      body: JSON.stringify({
        title,
        care_type: intake.care_type ?? undefined,
        city: intake.preferred_city ?? undefined,
        availability: intake.preferred_schedule ?? intake.care_frequency ?? undefined,
        budget_min: intake.budget_min ?? undefined,
        budget_max: intake.budget_max ?? undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreatingJob(false);
    if (data.id) router.push(`/zorenta/jobs/${data.id}?created=1`);
  };

  if (loading) {
    return (
      <PageContainer maxWidth="default" className="space-y-8">
        <ZorentaPageSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="default" className="space-y-8">
      <ZorentaPageHeader
        title="Intake resultaat"
        description="Je zorgvraag en de beste matches."
        backHref="/zorenta/dashboard"
        backLabel="Dashboard"
      />

      {/* Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-emerald-600" />
            Samenvatting zorgvraag
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 pt-6 sm:grid-cols-2">
          {intake?.care_type && (
            <p className="text-sm">
              <span className="font-medium text-slate-700">Type zorg:</span>{" "}
              <span className="text-slate-900">{intake.care_type}</span>
            </p>
          )}
          {intake?.care_frequency && (
            <p className="text-sm">
              <span className="font-medium text-slate-700">Frequentie:</span>{" "}
              <span className="text-slate-900">{intake.care_frequency}</span>
            </p>
          )}
          {intake?.preferred_city && (
            <p className="text-sm">
              <span className="font-medium text-slate-700">Locatie:</span>{" "}
              <span className="text-slate-900">{intake.preferred_city}</span>
            </p>
          )}
          {intake?.skills_required?.length ? (
            <p className="text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Vaardigheden:</span>{" "}
              <span className="text-slate-900">{intake.skills_required.join(", ")}</span>
            </p>
          ) : null}
          {(intake?.budget_min != null || intake?.budget_max != null) && (
            <p className="text-sm">
              <span className="font-medium text-slate-700">Budget:</span>{" "}
              <span className="text-slate-900">
                €{intake!.budget_min ?? "—"}–€{intake!.budget_max ?? "—"} /uur
              </span>
            </p>
          )}
          {intake?.urgency && (
            <p className="text-sm">
              <span className="font-medium text-slate-700">Urgentie:</span>{" "}
              <span className="text-slate-900">{intake.urgency}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Primary CTA: Vacature aanmaken */}
      <Card className="overflow-hidden border-emerald-200 bg-emerald-50/80">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-800">
            Zet deze zorgvraag om in een vacature. Zorgverleners kunnen dan solliciteren.
          </p>
          <Button
            onClick={createJobFromIntake}
            disabled={creatingJob}
            className="w-full shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
          >
            <Briefcase className="h-4 w-4" />
            {creatingJob ? "Bezig…" : "Maak vacature van intake"}
          </Button>
        </CardContent>
      </Card>

      {/* Top caregiver matches */}
      <section>
        <ZorentaSectionHeader
          title="Beste matches"
          description="Zorgverleners die passen bij je intake"
        />
        {matches.length === 0 ? (
          <ZorentaEmptyState
            icon={User}
            title="Nog geen matches"
            description="Pas je intake aan of plaats een vacature om meer zichtbaarheid te krijgen."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/zorenta/intake">
                  <Button variant="outline">Intake aanpassen</Button>
                </Link>
                <Button onClick={createJobFromIntake} disabled={creatingJob}>
                  Vacature aanmaken
                </Button>
              </div>
            }
            className="mt-4"
          />
        ) : (
          <div className="mt-4 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Beste zorgverleners</h3>
            {matches.slice(0, 5).map((m) => (
              <CaregiverCard
                key={m.caregiver.profile_id}
                profileId={m.caregiver.profile_id}
                name={m.caregiver.display_name ?? "Zorgverlener"}
                headline={m.caregiver.headline}
                experienceYears={m.caregiver.experience_years}
                skills={m.reasons ?? []}
                rating={undefined}
                hourlyRate={m.caregiver.hourly_rate}
                location={m.caregiver.city}
                matchScore={m.score}
                showActions={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Secondary CTAs */}
      <div className="flex flex-wrap justify-center gap-3 border-t border-slate-200 pt-6">
        <Link href="/zorenta/jobs/new">
          <Button variant="outline" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Handmatig vacature plaatsen
          </Button>
        </Link>
        <Link href="/zorenta/search?type=caregivers">
          <Button variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Alle zorgverleners zoeken
          </Button>
        </Link>
      </div>
    </PageContainer>
  );
}

export default function IntakeResultsPage() {
  return (
    <Suspense fallback={<ZorentaPageSkeleton />}>
      <IntakeResultsContent />
    </Suspense>
  );
}
