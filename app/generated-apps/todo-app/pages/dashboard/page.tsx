"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API = "/api/generated-apps/todo-app";

export default function DashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`${API}/todos`).then((r) => r.json()).then((d) => setCounts((c) => ({ ...c, "todos": Array.isArray(d?.data) ? d.data.length : 0 }))).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card key="todos" className="p-4">
          <p className="text-sm font-medium text-slate-500">Todos</p>
          <p className="text-2xl font-semibold text-slate-900">{counts["todos"] ?? 0}</p>
          <Link href="/generated-apps/todo-app/pages/todos"><Button variant="outline" size="sm" className="mt-2">View</Button></Link>
        </Card>
      </div>
    </div>
  );
}
