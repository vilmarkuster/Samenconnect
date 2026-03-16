"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AppPlan = {
  id: string;
  app_name: string;
  description: string | null;
  spec_json: any;
  created_at: string;
};

export default function BuilderPage() {
  const [plan, setPlan] = useState<AppPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestPlan() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/app-plans");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            data?.error ||
            data?.detail ||
            `Failed to load app plan (status ${res.status}).`;
          if (!cancelled) {
            setError(message);
          }
          return;
        }
        const data = await res.json();
        const fromApi: AppPlan | null =
          data?.appPlan && typeof data.appPlan === "object"
            ? data.appPlan
            : null;
        if (!cancelled) {
          setPlan(fromApi);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message =
            err?.message ||
            (typeof err === "string" ? err : "Failed to load app plan.");
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadLatestPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const spec = plan?.spec_json ?? {};
  const pages = Array.isArray(spec.pages) ? spec.pages : [];
  const tables = Array.isArray(spec.databaseTables) ? spec.databaseTables : [];
  const routes = Array.isArray(spec.apiRoutes) ? spec.apiRoutes : [];
  const agents = Array.isArray(spec.agents) ? spec.agents : [];
  const workflows = Array.isArray(spec.workflows) ? spec.workflows : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="App Builder"
        description="Describe an app in the AI Chat and review the generated plan here."
        children={isLoading ? <span className="text-xs text-slate-500">Loading…</span> : undefined}
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {!plan && !isLoading ? (
        <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-slate-200 bg-slate-50/60 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            No app plans yet.
          </p>
          <p className="max-w-md text-xs text-slate-500">
            Go to the AI Chat page and ask it to build an app (for example:
            &quot;Build me a SaaS for invoices&quot;). The generated plan will
            appear here.
          </p>
        </Card>
      ) : null}

      {plan && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {plan.app_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {plan.description || "No description provided."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={
                    "/generated-apps/" +
                    (plan.app_name
                      .replace(/[^a-zA-Z0-9]+/g, "-")
                      .toLowerCase()
                      .replace(/^-|-$/g, "") || "app") +
                    "/pages/dashboard"
                  }
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Open generated app
                </Link>
                <p className="text-xs text-slate-400">
                Generated{" "}
                {new Date(plan.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Pages</h3>
              {pages.length === 0 ? (
                <p className="text-xs text-slate-500">No pages defined.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {pages.map((page: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">
                        {page?.name || `Page ${idx + 1}`}
                      </span>
                      {page?.description && (
                        <span className="text-slate-500">
                          {" "}
                          – {page.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Database tables
              </h3>
              {tables.length === 0 ? (
                <p className="text-xs text-slate-500">No tables defined.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {tables.map((table: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">
                        {table?.name || `Table ${idx + 1}`}
                      </span>
                      {table?.description && (
                        <span className="text-slate-500">
                          {" "}
                          – {table.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                API routes
              </h3>
              {routes.length === 0 ? (
                <p className="text-xs text-slate-500">No API routes defined.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {routes.map((route: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">
                        {route?.path || `Route ${idx + 1}`}
                      </span>
                      {route?.description && (
                        <span className="text-slate-500">
                          {" "}
                          – {route.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Agents</h3>
              {agents.length === 0 ? (
                <p className="text-xs text-slate-500">No agents defined.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {agents.map((agent: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">
                        {agent?.name || `Agent ${idx + 1}`}
                      </span>
                      {agent?.status && (
                        <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                          {agent.status}
                        </span>
                      )}
                      {agent?.description && (
                        <div className="text-slate-500">
                          {agent.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Workflows
              </h3>
              {workflows.length === 0 ? (
                <p className="text-xs text-slate-500">No workflows defined.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {workflows.map((workflow: any, idx: number) => (
                    <li key={idx}>
                      <span className="font-semibold">
                        {workflow?.name || `Workflow ${idx + 1}`}
                      </span>
                      {workflow?.status && (
                        <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                          {workflow.status}
                        </span>
                      )}
                      {workflow?.description && (
                        <div className="text-slate-500">
                          {workflow.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

