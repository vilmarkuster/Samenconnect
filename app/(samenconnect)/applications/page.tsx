"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { FileText } from "lucide-react";
import { CaregiverApplicationThreadButton } from "@/components/zorenta/caregiver-application-thread-button";

type App = {
  id: string;
  job_id: string;
  applicant_id?: string;
  /** Van API: alleen true bij `caregiver_profiles` voor deze sollicitant (renderbare publieke profielpagina). */
  applicant_has_renderable_public_profile?: boolean;
  conversation_id?: string | null;
  status: string;
  message: string | null;
  created_at: string;
  care_jobs?: { id: string; title: string; status: string; poster_id?: string };
  profiles?: { display_name: string | null };
};

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFilter = searchParams.get("job_id") ?? "";
  const [applications, setApplications] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      const url = jobIdFilter ? `/api/zorenta/applications?job_id=${jobIdFilter}` : "/api/zorenta/applications";
      Promise.all([
        fetch(url, { headers: zorentaHeaders(token) }),
        fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
      ])
        .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
        .then(([d1, d2]) => {
          if (!cancelled) {
            setApplications(d1.applications ?? []);
            setMyRole(d2.profile?.role ?? null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, [jobIdFilter]);

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title={myRole === "caregiver" ? "Mijn sollicitaties" : "Sollicitaties op jouw opdrachten"}
        description={
          myRole === "caregiver"
            ? "Overzicht van je reacties op opdrachten en de status daarvan."
            : "Zorgverleners die op jouw opdrachten hebben gereageerd — berichten en vervolgstappen."
        }
      />
      {applications.length === 0 ? (
        <ZorentaEmptyState
          icon={FileText}
          title="Nog geen sollicitaties"
          description={
            myRole === "caregiver"
              ? "Bekijk opdrachten en reageer om hier je sollicitaties te zien."
              : "Plaats een opdracht of gebruik AI-zoeken om zorgverleners te vinden."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/jobs">
                <Button>{myRole === "caregiver" ? "Bekijk opdrachten" : "Opdrachtenmarkt"}</Button>
              </Link>
              {myRole !== "caregiver" && (
                <Link href="/matches?source=ai-finder">
                  <Button variant="outline">AI zorgverleners zoeken</Button>
                </Link>
              )}
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="text-base font-semibold">
                    {app.care_jobs ? (
                      <Link
                        href={`/jobs/${app.care_jobs.id}`}
                        className="hover:text-primary-600 hover:underline"
                      >
                        {app.care_jobs.title}
                      </Link>
                    ) : (
                      `Opdracht ${app.job_id}`
                    )}
                  </CardTitle>
                  <StatusBadge status={app.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.profiles && (
                  <p className="text-sm text-slate-600">
                    Sollicitant: <span className="font-medium text-slate-900">{app.profiles.display_name || "—"}</span>
                  </p>
                )}
                {app.message && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{app.message}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/jobs/${app.job_id}`}>
                    <Button variant="outline" size="sm">
                      Opdracht
                    </Button>
                  </Link>
                  {myRole === "caregiver" && app.conversation_id ? (
                    <Link href={`/berichten?conversation=${encodeURIComponent(app.conversation_id)}`}>
                      <Button
                        size="sm"
                        className="bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                      >
                        Open gesprek
                      </Button>
                    </Link>
                  ) : null}
                  {myRole === "caregiver" && !app.conversation_id && app.care_jobs?.poster_id ? (
                    <CaregiverApplicationThreadButton
                      posterId={app.care_jobs.poster_id}
                      applicationId={app.id}
                      jobId={app.job_id}
                      introBody={app.message}
                    />
                  ) : null}
                  {myRole !== "caregiver" && app.applicant_id ? (
                    <>
                      {app.applicant_has_renderable_public_profile === true ? (
                        <Link href={`/caregivers/${app.applicant_id}`}>
                          <Button variant="outline" size="sm">
                            Bekijk profiel
                          </Button>
                        </Link>
                      ) : (
                        <div className="inline-flex flex-col gap-0.5">
                          <Button variant="outline" size="sm" disabled className="border-slate-200">
                            Bekijk profiel
                          </Button>
                          <span className="text-[11px] text-slate-500">Profiel nog niet beschikbaar</span>
                        </div>
                      )}
                      <StartConversationButton
                        applicantId={app.applicant_id}
                        applicationId={app.id}
                        jobId={app.job_id}
                        conversationId={app.conversation_id ?? null}
                        isAccepted={app.status === "accepted"}
                      />
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ZorentaPageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "accepted"
      ? "success"
      : status === "rejected"
        ? "secondary"
        : "outline";
  const label =
    status === "accepted"
      ? "Geaccepteerd"
      : status === "rejected"
        ? "Afgewezen"
        : status === "shortlisted"
          ? "Shortlist"
          : "In afwachting";
  return <Badge variant={variant}>{label}</Badge>;
}

const SUGGESTED_APPLICATION_MESSAGE =
  "Hoi! Ik heb net gereageerd op deze opdracht. Ik kom graag in contact.";

function StartConversationButton({
  applicantId,
  applicationId,
  jobId,
  isAccepted,
  conversationId,
}: {
  applicantId: string;
  applicationId: string;
  jobId: string;
  isAccepted?: boolean;
  conversationId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasThread = Boolean(conversationId);
  async function start() {
    setLoading(true);
    setError(null);
    if (conversationId) {
      router.push(`/berichten?conversation=${encodeURIComponent(conversationId)}`);
      setLoading(false);
      return;
    }
    const token = await getZorentaAccessToken();
    if (!token) {
      setLoading(false);
      setError("Log in om een gesprek te starten.");
      return;
    }
    const res = await fetch("/api/zorenta/conversations", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({
        other_user_id: applicantId,
        application_id: applicationId,
        job_id: jobId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (data.id) {
      if (data.created === true) {
        router.push(
          `/berichten?conversation=${encodeURIComponent(data.id)}&prefill=${encodeURIComponent(SUGGESTED_APPLICATION_MESSAGE)}`
        );
      } else {
        router.push(`/berichten?conversation=${encodeURIComponent(data.id)}`);
      }
      return;
    }
    setError(typeof data?.error === "string" ? data.error : "Gesprek starten is mislukt.");
  }
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant={isAccepted ? "primary" : "outline"}
        onClick={start}
        disabled={loading}
        className={isAccepted ? "bg-emerald-600 hover:bg-emerald-700" : ""}
      >
        {loading ? "…" : hasThread || isAccepted ? "Open gesprek" : "Bericht sturen"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function ApplicationActions({
  applicationId,
  currentStatus,
  onStatusChange,
  onConversationCreated,
}: {
  applicationId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  onConversationCreated?: (conversationId: string) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [updating, setUpdating] = useState(false);
  const token = getZorentaAccessToken();
  const canAcceptReject = status === "pending" || status === "shortlisted";

  async function updateStatus(newStatus: string) {
    const t = await token;
    if (!t) return;
    setUpdating(true);
    const res = await fetch(`/api/zorenta/applications/${applicationId}`, {
      method: "PUT",
      headers: zorentaHeaders(t),
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json().catch(() => ({}));
    setUpdating(false);
    if (res.ok && data.status) {
      setStatus(data.status);
      onStatusChange?.(data.status);
      if (data.status === "accepted" && data.conversation_id) {
        onConversationCreated?.(data.conversation_id);
      }
    }
  }

  if (status === "accepted") {
    return (
      <span className="text-sm font-medium text-emerald-600">Geaccepteerd</span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="text-sm text-slate-500">Afgewezen</span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => updateStatus(e.target.value)}
        disabled={updating}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-60"
      >
        <option value="pending">In afwachting</option>
        <option value="shortlisted">Shortlist</option>
        <option value="accepted">Geaccepteerd</option>
        <option value="rejected">Afgewezen</option>
      </select>
      {canAcceptReject && (
        <>
          <Button size="sm" onClick={() => updateStatus("accepted")} disabled={updating}>
            Accepteren
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateStatus("rejected")} disabled={updating}>
            Afwijzen
          </Button>
        </>
      )}
    </div>
  );
}
