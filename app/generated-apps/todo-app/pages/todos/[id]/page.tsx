"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = "/api/generated-apps/todo-app";

type Row = { id: string; name?: string; description?: string; [k: string]: unknown };

export default function TodosDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/todos/${encodeURIComponent(id)}`).then((r) => r.json()).then((d) => { setItem(d); setName(d?.name ?? ""); setDescription(d?.description ?? ""); }).catch(() => setItem(null));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/todos/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || null, description: description.trim() || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      setItem((p) => (p ? { ...p, name, description } : null));
    } catch {}
    finally { setSaving(false); }
  }

  if (!item) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <Link href="/generated-apps/todo-app/pages/todos" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
      <h1 className="text-2xl font-semibold text-slate-900">{item.name ?? "Detail"}</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Link href="/generated-apps/todo-app/pages/todos"><Button type="button" variant="outline">Back</Button></Link></div>
        </form>
      </Card>
    </div>
  );
}
