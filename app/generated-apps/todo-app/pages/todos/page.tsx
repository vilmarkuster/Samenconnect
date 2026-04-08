"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api/generated-apps/todo-app";

type Row = { id: string; name?: string; description?: string; created_at?: string; [k: string]: unknown };

export default function TodosListPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/todos`).then((r) => r.json()).then((d) => setItems(Array.isArray(d?.data) ? d.data : [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Todos</h1>
        <Link href="/generated-apps/todo-app/pages/todos/new"><Button>Add new</Button></Link>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">No items yet. <Link href="/generated-apps/todo-app/pages/todos/new" className="text-primary-600 underline">Create one</Link>.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((row) => (
            <Card key={row.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{row.name ?? row.id}</p>
                {row.description && <p className="text-xs text-slate-500">{row.description}</p>}
              </div>
              <Link href={"/generated-apps/todo-app/pages/todos/" + row.id}><Button variant="ghost" size="sm">Edit</Button></Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
