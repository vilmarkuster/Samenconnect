"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api/generated-apps/klanten-crm";

type Task = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  due_date?: string;
  created_at?: string;
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "open").toLowerCase();
  const styles: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    done: "bg-emerald-100 text-emerald-800"
  };
  const label = s === "done" ? "Afgerond" : "Open";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[s] ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

export default function TakenPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/tasks`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Taken</h1>
        <Link href="/generated-apps/klanten-crm/pages/taken/new">
          <Button>Nieuwe taak</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Laden…</p>
      ) : items.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-slate-500">Nog geen taken.</p>
          <Link href="/generated-apps/klanten-crm/pages/taken/new">
            <Button variant="outline" size="sm" className="mt-2">Nieuwe taak</Button>
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Link key={t.id} href={`/generated-apps/klanten-crm/pages/taken/${t.id}`}>
              <Card className="p-4 transition hover:border-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{t.title || "—"}</p>
                  <StatusBadge status={t.status} />
                </div>
                {t.due_date && (
                  <p className="mt-1 text-xs text-slate-500">
                    Uiterlijk: {new Date(t.due_date).toLocaleDateString("nl-NL")}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
