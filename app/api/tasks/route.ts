import { NextRequest } from "next/server";
import { getPlatformSupabaseServerClient, getPlatformUserOrNull } from "@/lib/platform-supabase-server";

type TaskRow = {
  id: number;
  name: string;
  workflow_id: number | null;
  workflow_name: string | null;
  status: "Queued" | "Running" | "Completed" | "Failed";
  created_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/tasks] Supabase GET error", error);
      return new Response(
        JSON.stringify({ error: "Failed to load tasks.", detail: error.message }),
        { status: 500 }
      );
    }

    const tasks: TaskRow[] = (data ?? []) as TaskRow[];

    return new Response(JSON.stringify({ tasks }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/tasks] Unexpected GET error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while loading tasks.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const body = await req.json();
    const name: string | undefined = body?.name;
    const workflowId: number | undefined =
      typeof body?.workflow_id === "number" ? body.workflow_id : undefined;
    const workflowName: string | undefined = body?.workflow_name;
    const status: TaskRow["status"] = body?.status ?? "Queued";

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'name'." }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        name,
        workflow_id: workflowId ?? null,
        workflow_name: workflowName ?? null,
        status
      })
      .select("*")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/tasks] Supabase POST error", error);
      return new Response(
        JSON.stringify({ error: "Failed to create task.", detail: error.message }),
        { status: 500 }
      );
    }

    const task = data as TaskRow;

    return new Response(JSON.stringify({ task }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/tasks] Unexpected POST error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while creating task.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

