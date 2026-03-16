"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api/generated-apps/klanten-crm";

export default function DashboardPage() {
  const [stats, setStats] = useState({ companies: 0, openDeals: 0, openTasks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then((d) => {
        setStats({
          companies: d.companies ?? 0,
          openDeals: d.openDeals ?? 0,
          openTasks: d.openTasks ?? 0
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      {loading ? (
        <p className="text-sm text-slate-500">Laden…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm font-medium text-slate-500">Klanten</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.companies}</p>
            <Link href="/generated-apps/klanten-crm/pages/klanten">
              <Button variant="outline" size="sm" className="mt-2">
                Bekijken
              </Button>
            </Link>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-slate-500">Open deals</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.openDeals}</p>
            <Link href="/generated-apps/klanten-crm/pages/deals">
              <Button variant="outline" size="sm" className="mt-2">
                Bekijken
              </Button>
            </Link>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-slate-500">Open taken</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.openTasks}</p>
            <Link href="/generated-apps/klanten-crm/pages/taken">
              <Button variant="outline" size="sm" className="mt-2">
                Bekijken
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
