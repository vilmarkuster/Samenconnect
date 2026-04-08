"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Agent = {
  id: number | string;
  name: string;
  description: string;
  status: "Active" | "Draft";
  created_at?: string;
};

export default function EditAgentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const res = await fetch(`/api/agents/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            data?.error ||
            data?.detail ||
            `Failed to load agent (status ${res.status}).`;
          if (!cancelled) setError(message);
          return;
        }
        const a: Agent | null = data?.agent && typeof data.agent === "object" ? data.agent : null;
        if (!cancelled && a) {
          setAgent(a);
          setName(a.name);
          setDescription(a.description ?? "");
        } else if (!cancelled) {
          setError("Agent not found.");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load agent.";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          data?.error ||
          data?.detail ||
          `Failed to save (status ${res.status}).`;
        setError(message);
        return;
      }
      const updated: Agent | null =
        data?.agent && typeof data.agent === "object" ? data.agent : null;
      if (updated) setAgent(updated);
      router.push("/agents");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Edit agent"
        description="Update the agent name and description."
        children={
          <Button type="button" variant="outline" onClick={() => router.push("/agents")}>
            Back to agents
          </Button>
        }
      />

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : agent ? (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <label htmlFor="agent-name" className="text-sm font-medium text-slate-900">
              Name
            </label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="agent-description" className="text-sm font-medium text-slate-900">
              Description
            </label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="resize-y"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/agents")}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
