"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api/generated-apps/klanten-crm";

type Deal = {
  id: string;
  title?: string;
  value?: number;
  status?: string;
  created_at?: string;
};

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "open").toLowerCase();
  const styles: Record<string, string> = {
    open: "bg-amber-100 text-amber-800",
    won: "bg-emerald-100 text-emerald-800",
    lost: "bg-slate-100 text-slate-600"
  };
  const label = s === "won" ? "Gewonnen" : s === "lost" ? "Verloren" : "Open";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[s] ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<Deal | null>(null);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/deals/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        setItem(d);
        setTitle(d.title ?? "");
        setValue(d.value != null ? String(d.value) : "");
        setStatus(d.status ?? "open");
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API}/deals/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          value: value.trim() ? Number(value) : null,
          status: status || "open"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bijwerken mislukt");
      setItem((prev) => (prev ? { ...prev, title, value: value ? Number(value) : undefined, status } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bijwerken mislukt");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Laden…</p>;
  if (!item) return <p className="text-sm text-red-600">Deal niet gevonden.</p>;

  return (
    <div className="space-y-6">
      <Link href="/generated-apps/klanten-crm/pages/deals" className="text-sm text-slate-600 hover:text-slate-900">← Deals</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{item.title || "Deal"}</h1>
        <StatusBadge status={status} />
      </div>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titel *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Waarde (€)</label>
            <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="open">Open</option>
              <option value="won">Gewonnen</option>
              <option value="lost">Verloren</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            <Link href="/generated-apps/klanten-crm/pages/deals">
              <Button type="button" variant="outline">Terug</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
