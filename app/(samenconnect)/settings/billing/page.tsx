"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, AlertCircle } from "lucide-react";
import { getPlanBySlug } from "@/lib/zorenta/plans";

type BillingStatus = {
  planSlug: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  isTestMode: boolean;
  billingEnabled: boolean;
};

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      fetch("/api/zorenta/billing/status", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && !d.error) setStatus(d);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  const plan = status?.planSlug ? getPlanBySlug(status.planSlug as "free" | "pro" | "team" | "featured") : null;

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Facturatie"
        description="Je abonnement en betalingsgegevens."
        backHref="/dashboard"
        backLabel="Dashboard"
        actions={
          <Link href="/settings/plans">
            <Button variant="outline" size="sm">
              Bekijk abonnementen
            </Button>
          </Link>
        }
      />

      {status?.isTestMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Testmodus: betalingen zijn nog niet actief. Dit is alleen een voorbereiding voor later.</span>
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Sandbox
          </Badge>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Huidig plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan ? (
              <>
                <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                <p className="text-sm text-slate-500">{plan.description}</p>
                {status?.subscriptionStatus && (
                  <Badge variant="outline" className="mt-1">
                    {status.subscriptionStatus}
                  </Badge>
                )}
              </>
            ) : (
              <p className="text-slate-600">Gratis</p>
            )}
            <Link href="/settings/plans" className="mt-2 inline-block">
              <Button size="sm" variant="outline">
                Plan wijzigen
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-slate-500" />
              Betaalmethode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Nog geen betaalmethode gekoppeld. Na het kiezen van een betaald plan kun je hier je gegevens beheren.
            </p>
            {status?.stripeCustomerId && (
              <p className="mt-2 text-xs text-slate-400 font-mono">
                Klant-ID: {status.stripeCustomerId.slice(0, 20)}…
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-slate-500" />
            Factuurgeschiedenis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">Nog geen facturen</p>
            <p className="mt-1 text-xs text-slate-500">Facturen verschijnen hier zodra betalingen actief zijn.</p>
          </div>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
