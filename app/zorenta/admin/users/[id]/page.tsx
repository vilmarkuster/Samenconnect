"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Flag, UserX, Shield, AlertCircle } from "lucide-react";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [billing, setBilling] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      fetch(`/api/zorenta/admin/users/${id}/billing`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && !d.error) setBilling(d);
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

  const b = billing ?? {};

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <Link
        href="/zorenta/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Gebruikers
      </Link>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Profiel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="text-slate-500">ID:</span> <code className="text-xs bg-slate-100 px-1 rounded">{id}</code></p>
          <p><span className="text-slate-500">Naam:</span> {(b as Record<string, string>)?.displayName ?? "—"}</p>
          <p><span className="text-slate-500">Rol:</span> <Badge variant="outline">{(b as Record<string, string>)?.role ?? "—"}</Badge></p>
          <p><span className="text-slate-500">Plan:</span> {(b as Record<string, string>)?.planSlug ?? "free"}</p>
          <p><span className="text-slate-500">Abonnement:</span> {(b as Record<string, string>)?.subscriptionStatus ?? "—"}</p>
          {(b as Record<string, string>)?.stripeCustomerId && (
            <p><span className="text-slate-500">Stripe-klant:</span> <code className="text-xs bg-slate-100 px-1 rounded">{(b as Record<string, string>).stripeCustomerId}</code></p>
          )}
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
            <Flag className="h-4 w-4" />
            Markeer / flag (binnenkort)
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <UserX className="h-4 w-4" />
            Deactiveren (binnenkort)
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Shield className="h-4 w-4" />
            Admin-rechten (binnenkort)
          </Button>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
