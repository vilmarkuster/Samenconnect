"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Workflow = {
  id: number | string;
  name: string;
  description: string | null;
  status: string | null;
  created_at?: string;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((d) => setWorkflows(Array.isArray(d?.workflows) ? d.workflows : []))
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workflows"
        description="Orchestrate multi-step automations that connect agents, prompts, and tools."
        children={<Button>Create workflow</Button>}
      />

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Loading…
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No workflows yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create a workflow to chain agents and automations.
            </p>
            <Button size="sm" className="mt-4">
              Create workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  <Badge variant={wf.status === "Active" ? "success" : "secondary"}>
                    {wf.status ?? "Draft"}
                  </Badge>
                </div>
                {wf.description && (
                  <CardDescription className="line-clamp-2">
                    {wf.description}
                  </CardDescription>
                )}
                {wf.created_at && (
                  <p className="text-xs text-slate-400">
                    {new Date(wf.created_at).toLocaleDateString()}
                  </p>
                )}
              </CardHeader>
              <CardContent className="mt-auto flex gap-2 pt-0">
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  Run once
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
