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
import { Check, AlertCircle } from "lucide-react";
import {
  getPlansForRole,
  type PlanDefinition,
  type PlanSlug,
} from "@/lib/zorenta/plans";

function PlanCard({
  plan,
  currentPlanSlug,
  onUpgrade,
}: {
  plan: PlanDefinition;
  currentPlanSlug: string;
  onUpgrade: (slug: PlanSlug) => void;
}) {
  const isCurrent = plan.slug === currentPlanSlug;
  const isPaid = plan.slug !== "free";

  return (
    <Card
      className={`relative overflow-hidden border-2 transition-shadow ${
        plan.highlighted ? "border-emerald-400 shadow-md" : "border-slate-200"
      }`}
    >
      {plan.highlighted && (
        <div className="bg-emerald-500 px-3 py-1 text-center text-xs font-medium text-white">
          Aanbevolen
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          {isCurrent && (
            <Badge variant="secondary" className="shrink-0">
              Huidige plan
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-500">{plan.description}</p>
        <p className="text-2xl font-bold text-slate-900">{plan.priceLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              {f.included ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <span className="inline-block h-4 w-4 shrink-0" />
              )}
              <span className={f.included ? "text-slate-700" : "text-slate-400"}>{f.label}</span>
            </li>
          ))}
        </ul>
        {isCurrent ? (
          <Button variant="outline" size="sm" className="w-full" disabled>
            {plan.ctaLabel}
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full"
            variant={plan.highlighted ? "default" : "outline"}
            onClick={() => onUpgrade(plan.slug)}
            disabled={!isPaid}
          >
            {isPaid ? plan.ctaLabel : plan.ctaLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function PlansPage() {
  const [role, setRole] = useState<"caregiver" | "client" | "organization" | null>(null);
  const [planSlug, setPlanSlug] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      Promise.all([
        fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
        fetch("/api/zorenta/billing/status", { headers: zorentaHeaders(token) }),
      ])
        .then(([meRes, billingRes]) => Promise.all([meRes.json(), billingRes.json()]))
        .then(([meData, billingData]) => {
          if (cancelled) return;
          const r = meData?.profile?.role;
          if (r === "caregiver" || r === "client" || r === "organization") setRole(r);
          if (billingData?.planSlug) setPlanSlug(billingData.planSlug);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpgrade(slug: PlanSlug) {
    const token = await getZorentaAccessToken();
    if (!token) return;
    const res = await fetch("/api/zorenta/billing/checkout-session", {
      method: "POST",
      headers: { ...zorentaHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ plan_slug: slug }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.url) window.location.href = data.url;
    if (data?.message) alert(data.message);
  }

  if (loading) return <ZorentaPageSkeleton />;

  const plans = role ? getPlansForRole(role) : getPlansForRole("client");

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <ZorentaPageHeader
        title="Abonnementen"
        description="Kies een plan dat bij je past. Betaalde opties komen binnenkort."
        backHref="/zorenta/settings/billing"
        backLabel="Facturatie"
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Testmodus: upgrade-knoppen leiden nog niet naar een echte betaling.</span>
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          Sandbox
        </Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.slug}
            plan={plan}
            currentPlanSlug={planSlug}
            onUpgrade={handleUpgrade}
          />
        ))}
      </div>

      <div className="text-center">
        <Link href="/zorenta/settings/billing">
          <Button variant="ghost" size="sm">
            ← Terug naar facturatie
          </Button>
        </Link>
      </div>
    </ZorentaPageContainer>
  );
}
