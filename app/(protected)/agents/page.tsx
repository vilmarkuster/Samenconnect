"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS } from "@/lib/zorenta/caregiver-public-profile-route-id";

type Agent = {
  id: number | string;
  name: string;
  description: string;
  status: "Active" | "Draft";
  created_at?: string;
};

type AgentRun = {
  id: number | string;
  agentId: number | string;
  agentName: string;
  output: string;
};

function isMatchAgentName(name: string) {
  return name.trim().toLowerCase() === "match agent";
}

type MatchAgentResult = {
  matches: Array<{
    caregiverId?: string;
    caregiverName?: string;
    fitScore?: number;
    reason?: string;
    concerns?: string[];
    recommendation?: string;
  }>;
};

function tryParseMatchAgentResult(raw: string): MatchAgentResult | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  const fencedBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const cleaned = (fencedBlockMatch ? fencedBlockMatch[1] : trimmed).trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const matches = (parsed as any).matches;
    if (!Array.isArray(matches)) return null;
    return parsed as MatchAgentResult;
  } catch {
    return null;
  }
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeRunAgentId, setActiveRunAgentId] = useState<number | string | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [latestRunByAgentId, setLatestRunByAgentId] = useState<Record<string, string>>({});
  const [runErrorByAgentId, setRunErrorByAgentId] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/agents");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            data?.error ||
            data?.detail ||
            `Failed to load agents (status ${res.status}).`;
          if (!cancelled) {
            setError(message);
          }
          return;
        }
        const data = await res.json();
        const fromApi: Agent[] = Array.isArray(data?.agents)
          ? data.agents
          : [];
        if (!cancelled) {
          setAgents(fromApi);
        }
      } catch (err: any) {
        if (!cancelled) {
          const message =
            err?.message ||
            (typeof err === "string" ? err : "Failed to load agents.");
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAgents();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateAgent() {
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "New agent",
          description: "Describe what this agent should do.",
          status: "Draft"
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          data?.detail ||
          `Failed to create agent (status ${res.status}).`;
        setError(message);
        return;
      }

      const data = await res.json();
      const created: Agent | null =
        data?.agent && typeof data.agent === "object" ? data.agent : null;
      if (created) {
        setAgents(prev => [created, ...prev]);
      }
    } catch (err: any) {
      const message =
        err?.message ||
        (typeof err === "string" ? err : "Failed to create agent.");
      setError(message);
    }
  }

  async function handleDeleteAgent(agentId: number | string) {
    setError(null);
    try {
      const res = await fetch(`/api/agents?id=${agentId}`, {
        method: "DELETE"
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          data?.detail ||
          `Failed to delete agent (status ${res.status}).`;
        setError(message);
        return;
      }
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (err: any) {
      const message =
        err?.message ||
        (typeof err === "string" ? err : "Failed to delete agent.");
      setError(message);
    }
  }

  async function handleRunTest(agent: Agent) {
    setError(null);
    setRunErrorByAgentId((prev) => {
      const next = { ...prev };
      delete next[String(agent.id)];
      return next;
    });
    setActiveRunAgentId(agent.id);

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentId: agent.id,
          jobId: "17d4bc01-b3ad-4d43-86c2-d383c80a5b43"
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          data?.detail ||
          `Agent run failed with status ${res.status}`;
        setError(message);
        setRunErrorByAgentId((prev) => ({ ...prev, [String(agent.id)]: message }));
        return;
      }

      const data = await res.json();
      const output: string =
        typeof data?.output === "string"
          ? data.output
          : "No output returned from agent run.";

      setLatestRunByAgentId((prev) => ({ ...prev, [String(agent.id)]: output }));

      const newRun: AgentRun = {
        id: runs.length > 0 ? `${runs.length + 1}` : "1",
        agentId: agent.id,
        agentName: agent.name,
        output
      };
      setRuns(prev => [...prev, newRun]);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Agent run error", err);
      const message =
        err?.message || (typeof err === "string" ? err : "Agent run failed");
      setError(message);
      setRunErrorByAgentId((prev) => ({ ...prev, [String(agent.id)]: message }));
    } finally {
      setActiveRunAgentId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agents"
        description="Configure reusable AI agents to power your workflows and automations."
        children={
          <>
            {isLoading && (
              <span className="text-xs text-slate-500">Loading…</span>
            )}
            <Button onClick={handleCreateAgent}>Create agent</Button>
          </>
        }
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Agent library {agents.length > 0 && `(${agents.length})`}
        </h2>
        {agents.length === 0 && !isLoading ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-900">
                No agents yet
              </p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Create your first agent to encapsulate a reusable role and behavior you can trigger from workflows or chat.
              </p>
              <Button size="sm" className="mt-4" onClick={handleCreateAgent}>
                Create your first agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {agent.name}
                    </h3>
                    <Badge variant={agent.status === "Active" ? "success" : "warning"}>
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    {agent.description}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {agent.created_at
                      ? new Date(agent.created_at).toLocaleString()
                      : "—"}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto space-y-2 pt-0">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/agents/${agent.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRunTest(agent)}
                      disabled={activeRunAgentId === agent.id}
                    >
                      {activeRunAgentId === agent.id ? "Running…" : "Run test"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteAgent(agent.id)}
                    >
                      Delete
                    </Button>
                  </div>

                  {activeRunAgentId === agent.id && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div className="font-medium text-slate-900">Running test…</div>
                      <div className="mt-0.5 text-slate-500">
                        Calling <span className="font-mono">/api/agents/run</span>
                      </div>
                    </div>
                  )}

                  {runErrorByAgentId[String(agent.id)] && activeRunAgentId !== agent.id && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {runErrorByAgentId[String(agent.id)]}
                    </div>
                  )}

                  {latestRunByAgentId[String(agent.id)] && activeRunAgentId !== agent.id && (
                    isMatchAgentName(agent.name) ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-medium text-emerald-900">
                            Latest match result
                          </div>
                          <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            Match Agent
                          </div>
                        </div>
                        {(() => {
                          const parsed = tryParseMatchAgentResult(latestRunByAgentId[String(agent.id)]);
                          if (!parsed) {
                            return (
                              <div className="mt-1 whitespace-pre-wrap text-xs text-emerald-950">
                                {latestRunByAgentId[String(agent.id)]}
                              </div>
                            );
                          }

                          const topMatches = parsed.matches.slice(0, 3);
                          return (
                            <div className="mt-2 space-y-2">
                              {topMatches.map((m, idx) => {
                                const name = typeof m.caregiverName === "string" ? m.caregiverName : `Match ${idx + 1}`;
                                const caregiverId = typeof m.caregiverId === "string" ? m.caregiverId : "";
                                const fitScore =
                                  typeof m.fitScore === "number" && Number.isFinite(m.fitScore)
                                    ? Math.max(0, Math.min(100, Math.round(m.fitScore)))
                                    : null;
                                const reason = typeof m.reason === "string" ? m.reason : "";
                                const concerns = Array.isArray(m.concerns)
                                  ? m.concerns.filter((c) => typeof c === "string" && c.trim().length > 0)
                                  : [];
                                const recommendation =
                                  typeof m.recommendation === "string" ? m.recommendation : "";

                                return (
                                  <div
                                    key={`${caregiverId || idx}`}
                                    className={
                                      caregiverId
                                        ? "cursor-pointer rounded-lg border border-emerald-200 bg-white/70 px-3 py-2 transition hover:bg-white hover:shadow-soft"
                                        : "rounded-lg border border-emerald-200 bg-white/70 px-3 py-2"
                                    }
                                    onClick={() => {
                                      if (
                                        caregiverId &&
                                        !DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS.has(caregiverId)
                                      ) {
                                        router.push(`/zorenta/caregivers/${caregiverId}`);
                                      }
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold text-emerald-950">
                                          {name}
                                        </div>
                                        {caregiverId && (
                                          <div className="mt-0.5 text-[11px] text-emerald-900/70">
                                            {caregiverId}
                                          </div>
                                        )}
                                      </div>
                                      {fitScore !== null && (
                                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                                          {fitScore}%
                                        </span>
                                      )}
                                    </div>

                                    {reason && (
                                      <div className="mt-2 text-xs text-emerald-950">
                                        <span className="font-semibold">Reason:</span>{" "}
                                        {reason}
                                      </div>
                                    )}

                                    {concerns.length > 0 && (
                                      <div className="mt-2 text-xs text-emerald-950">
                                        <div className="font-semibold">Concerns:</div>
                                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-emerald-950">
                                          {concerns.map((c, i) => (
                                            <li key={i}>{c}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {recommendation && (
                                      <div className="mt-2 text-xs text-emerald-950">
                                        <span className="font-semibold">Recommendation:</span>{" "}
                                        {recommendation}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-[11px] font-medium text-slate-900">Latest output</div>
                        <div className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                          {latestRunByAgentId[String(agent.id)]}
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Recent agent runs
          {runs.length > 0 && (
            <span className="ml-2 font-normal text-slate-500">
              (latest {Math.min(runs.length, 10)})
            </span>
          )}
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No runs yet. Click &quot;Run test&quot; on an agent to see output here.
          </p>
        ) : (
          <div className="space-y-3">
            {runs
              .slice()
              .reverse()
              .slice(0, 10)
              .map((run) => (
                <Card key={run.id}>
                  <CardContent className="py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {run.agentName} <span className="text-slate-400">(run #{run.id})</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {run.output}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}


