"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Star, AlertCircle } from "lucide-react";

/** Shape from GET /api/zorenta/admin/jobs — keeps strict TS happy without widening UI types */
type AdminJobRow = {
  id: string;
  title?: string | null;
  status?: string | null;
  poster_type?: string | null;
  featured_until?: string | null;
  city?: string | null;
  care_type?: string | null;
  poster_id?: string | null;
};

export default function AdminJobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<AdminJobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) {
          setLoadError("Geen sessie.");
          setLoading(false);
        }
        return;
      }
      fetch(`/api/zorenta/admin/jobs?id=${encodeURIComponent(id)}`, { headers: zorentaHeaders(token) })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok || d.error) {
            setLoadError(typeof d.error === "string" ? d.error : `Fout (${r.status})`);
            setJob(null);
            return;
          }
          const jobs = (d.jobs ?? []) as AdminJobRow[];
          setJob(jobs[0] ?? null);
        })
        .catch(() => {
          if (!cancelled) setLoadError("Kon opdracht niet laden.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </ZorentaPageContainer>
    );
  }

  if (!job) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Opdrachten
        </Link>
        <p className="text-slate-600">Opdracht niet gevonden.</p>
      </ZorentaPageContainer>
    );
  }

  const j = job;

  const status =
    typeof j.status === "string" || typeof j.status === "number"
      ? String(j.status)
      : null;

  const posterType =
    typeof j.poster_type === "string" || typeof j.poster_type === "number"
      ? String(j.poster_type)
      : null;

  const isFeatured = Boolean(j.featured_until);

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Opdrachten
      </Link>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{j.title ?? ""}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {status ? <Badge variant="outline">{status}</Badge> : null}
            {posterType ? <Badge variant="secondary">{posterType}</Badge> : null}
            {isFeatured ? (
              <Badge className="bg-amber-100 text-amber-800">Uitgelicht</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Plaats: {j.city ?? "—"}</p>
          <p>Type zorg: {j.care_type ?? "—"}</p>
          <p>Poster ID: <code className="bg-slate-100 px-1 rounded">{j.poster_id ?? "—"}</code></p>
          <Link href={`/admin/users/${encodeURIComponent(j.poster_id ?? "")}`}>
            <Button variant="outline" size="sm">Bekijk poster</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Moderatie (nog niet geactiveerd)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Star className="h-4 w-4" />
            Uitgelicht zetten (binnenkort)
          </Button>
          <Button variant="outline" size="sm" disabled>
            Modereer (binnenkort)
          </Button>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
