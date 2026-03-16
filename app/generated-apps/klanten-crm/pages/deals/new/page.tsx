"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api/generated-apps/klanten-crm";

export default function NewDealPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          value: value.trim() ? Number(value) : null,
          status: status || "open"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      router.push("/generated-apps/klanten-crm/pages/deals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/generated-apps/klanten-crm/pages/deals" className="text-sm text-slate-600 hover:text-slate-900">← Deals</Link>
      <h1 className="text-2xl font-semibold text-slate-900">Nieuwe deal</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Titel *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dealnaam" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Waarde (€)</label>
            <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
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
              <Button type="button" variant="outline">Annuleren</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
