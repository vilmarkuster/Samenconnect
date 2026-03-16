"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api/generated-apps/klanten-crm";

type Company = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
};

export default function KlantenPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/companies`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Klanten</h1>
        <Link href="/generated-apps/klanten-crm/pages/klanten/new">
          <Button>Nieuwe klant</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Laden…</p>
      ) : items.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-slate-500">Nog geen klanten. Voeg er een toe.</p>
          <Link href="/generated-apps/klanten-crm/pages/klanten/new">
            <Button variant="outline" size="sm" className="mt-2">
              Nieuwe klant
            </Button>
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} href={`/generated-apps/klanten-crm/pages/klanten/${c.id}`}>
              <Card className="p-4 transition hover:border-slate-300">
                <p className="font-medium text-slate-900">{c.name || "—"}</p>
                {c.email && <p className="text-sm text-slate-500">{c.email}</p>}
                {c.phone && <p className="text-sm text-slate-500">{c.phone}</p>}
              </Card>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
