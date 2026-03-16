"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const API = "/api/generated-apps/klanten-crm";

type Activity = {
  id: string;
  type?: string;
  description?: string;
  created_at?: string;
};

export default function ActiviteitenPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState("call");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch(`${API}/activities`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/activities`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type || null, description: description.trim() || null })
      });
      if (res.ok) {
        setDescription("");
        setShowForm(false);
        refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const typeLabel: Record<string, string> = { call: "Bel", email: "E-mail", meeting: "Afspraak" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Activiteiten</h1>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "primary"}>
          {showForm ? "Sluiten" : "Nieuwe activiteit"}
        </Button>
      </div>
      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="call">Bel</option>
                <option value="email">E-mail</option>
                <option value="meeting">Afspraak</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Omschrijving</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
          </form>
        </Card>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Laden…</p>
      ) : items.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-slate-500">Nog geen activiteiten.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {typeLabel[a.type as string] ?? a.type ?? "—"}
              </span>
              <p className="mt-2 text-sm text-slate-900">{a.description || "—"}</p>
              {a.created_at && (
                <p className="mt-1 text-xs text-slate-500">{new Date(a.created_at).toLocaleString("nl-NL")}</p>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
