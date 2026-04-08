"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = "/api/generated-apps/todo-app";

export default function NewTodosPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || null, description: description.trim() || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      router.push("/generated-apps/todo-app/pages/todos");
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <Link href="/generated-apps/todo-app/pages/todos" className="text-sm text-slate-600 hover:text-slate-900">← Back</Link>
      <h1 className="text-2xl font-semibold text-slate-900">New Todos</h1>
      <Card className="max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button><Link href="/generated-apps/todo-app/pages/todos"><Button type="button" variant="outline">Cancel</Button></Link></div>
        </form>
      </Card>
    </div>
  );
}
