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

export default function AdminJobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      fetch(`/api/zorenta/admin/jobs?limit=100`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && !d.error) {
            const found = (d.jobs ?? []).find((j: { id: string }) => j.id === id);
            setJob(found ?? null);
          }
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
        <Link href="/zorenta/admin/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ChevronLeft className="h-4 w-4" /> Vacatures
        </Link>
        <p className="text-slate-600">Vacature niet gevonden.</p>
      </ZorentaPageContainer>
    );
  }

  const j = job as Record<string, unknown>;

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <Link
        href="/zorenta/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Vacatures
      </Link>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">{String(j.title ?? "")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{String(j.status ?? "")}</Badge>
            {Boolean(j.poster_type) && (
              <Badge variant="secondary">{String(j.poster_type ?? "")}</Badge>
            )}
            {Boolean(j.featured_until) && (
              <Badge className="bg-amber-100 text-amber-800">Uitgelicht</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Plaats: {String(j.city ?? "—")}</p>
          <p>Type zorg: {String(j.care_type ?? "—")}</p>
          <p>Poster ID: <code className="bg-slate-100 px-1 rounded">{String(j.poster_id)}</code></p>
          <Link href={`/zorenta/admin/users/${j.poster_id}`}>
            <Button variant="outline" size="sm">Bekijk poster</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Moderatie (placeholders)
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
