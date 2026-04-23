"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

type BillingUser = {
  userId: string;
  displayName: string | null;
  role: string;
  planSlug: string;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
};

export default function AdminBillingPage() {
  const [users, setUsers] = useState<BillingUser[]>([]);
  const [byPlan, setByPlan] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError(null);
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) {
          setDataError("Geen sessie.");
          setLoading(false);
        }
        return;
      }
      fetch("/api/zorenta/admin/billing?limit=50", { headers: zorentaHeaders(token) })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok || d.error) {
            setDataError(typeof d.error === "string" ? d.error : `Fout (${r.status})`);
            return;
          }
          setUsers(d.users ?? []);
          setByPlan(d.byPlan ?? {});
          setTotal(d.total ?? 0);
        })
        .catch(() => {
          if (!cancelled) setDataError("Kon facturatie niet laden.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Facturatie-overzicht</h1>
      <p className="text-sm text-slate-500">
        Plan en abonnementsstatus per gebruiker. Alleen zichtbaarheid, geen wijzigingen.
      </p>

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {dataError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["free", "pro", "team", "featured"].map((plan) => (
          <Card key={plan} className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Plan: {plan}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-slate-900">{byPlan[plan] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-slate-500" />
            Gebruikers met plan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Naam</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Abonnement</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Stripe-klant</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {!dataError && users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                        Geen gebruikers in dit overzicht (eerste pagina).
                      </td>
                    </tr>
                  ) : dataError ? null : (
                    users.map((u) => (
                      <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-900">{u.displayName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{u.planSlug}</td>
                        <td className="px-4 py-3 text-slate-600">{u.subscriptionStatus ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {u.stripeCustomerId ? `${u.stripeCustomerId.slice(0, 20)}…` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${u.userId}`}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Gebruiker
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {total} gebruiker(s) (eerste pagina)
            </p>
          )}
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
