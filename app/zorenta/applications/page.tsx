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

type App = {
  id: string;
  job_id: string;
  applicant_id?: string;
  status: string;
  message: string | null;
  created_at: string;
  care_jobs?: { id: string; title: string; status: string };
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
        title="Sollicitaties"
        description="Bekijk en beheer sollicitaties op vacatures."
      />
      {applications.length === 0 ? (
        <ZorentaEmptyState
          icon={FileText}
          title="Nog geen sollicitaties"
          description={myRole === "caregiver" ? "Bekijk geschikte vacatures en solliciteer om hier te verschijnen." : "Nodig zorgverleners uit of wacht op sollicitaties."}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/zorenta/jobs">
                <Button>Bekijk vacatures</Button>
              </Link>
              {myRole !== "caregiver" && (
                <Link href="/zorenta/search">
                  <Button variant="outline">Zorgverleners zoeken</Button>
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
                        href={`/zorenta/jobs/${app.care_jobs.id}`}
                        className="hover:text-primary-600 hover:underline"
                      >
                        {app.care_jobs.title}
                      </Link>
                    ) : (
                      `Vacature ${app.job_id}`
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
                  <Link href={`/zorenta/jobs/${app.job_id}`}>
                    <Button variant="outline" size="sm">
                      Vacature
                    </Button>
                  </Link>
                  {app.applicant_id && (
                    <>
                      <Link href={`/zorenta/caregivers/${app.applicant_id}`}>
                        <Button variant="outline" size="sm">
                          Profiel bekijken
                        </Button>
                      </Link>
                      <StartConversationButton applicantId={app.applicant_id} isAccepted={app.status === "accepted"} />
                    </>
                  )}
                  {(myRole === "client" || myRole === "organization") && (
                    <ApplicationActions
                      applicationId={app.id}
                      currentStatus={app.status}
                      onConversationCreated={(conversationId) => {
                        router.push(`/zorenta/messages/${conversationId}`);
                      }}
                    />
                  )}
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

function StartConversationButton({ applicantId, isAccepted }: { applicantId: string; isAccepted?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function start() {
    setLoading(true);
    const token = await getZorentaAccessToken();
    if (!token) return;
    const res = await fetch("/api/zorenta/conversations", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ other_user_id: applicantId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (data.id) router.push(`/zorenta/messages/${data.id}`);
  }
  return (
    <Button
      size="sm"
      variant={isAccepted ? "primary" : "outline"}
      onClick={start}
      disabled={loading}
      className={isAccepted ? "bg-emerald-600 hover:bg-emerald-700" : ""}
    >
      {loading ? "…" : isAccepted ? "Open gesprek" : "Bericht sturen"}
    </Button>
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
