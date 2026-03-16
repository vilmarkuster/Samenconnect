import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

type RunRow = {
  id: number;
  kind: "agent" | "workflow" | "task";
  agent_id: number | null;
  agent_name: string | null;
  workflow_id: number | null;
  workflow_name: string | null;
  task_id: number | null;
  input: string | null;
  output: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/runs] Supabase GET error", error);
      return new Response(
        JSON.stringify({ error: "Failed to load runs.", detail: error.message }),
        { status: 500 }
      );
    }

    const runs: RunRow[] = (data ?? []) as RunRow[];

    return new Response(JSON.stringify({ runs }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/runs] Unexpected GET error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while loading runs.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const kind: RunRow["kind"] = body?.kind ?? "agent";
    const agentId: number | undefined =
      typeof body?.agent_id === "number" ? body.agent_id : undefined;
    const agentName: string | undefined = body?.agent_name;
    const workflowId: number | undefined =
      typeof body?.workflow_id === "number" ? body.workflow_id : undefined;
    const workflowName: string | undefined = body?.workflow_name;
    const taskId: number | undefined =
      typeof body?.task_id === "number" ? body.task_id : undefined;
    const input: string | undefined = body?.input;
    const output: string | undefined = body?.output;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("runs")
      .insert({
        kind,
        agent_id: agentId ?? null,
        agent_name: agentName ?? null,
        workflow_id: workflowId ?? null,
        workflow_name: workflowName ?? null,
        task_id: taskId ?? null,
        input: input ?? null,
        output: output ?? null
      })
      .select("*")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/runs] Supabase POST error", error);
      return new Response(
        JSON.stringify({ error: "Failed to create run.", detail: error.message }),
        { status: 500 }
      );
    }

    const run = data as RunRow;

    return new Response(JSON.stringify({ run }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/runs] Unexpected POST error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while creating run.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

