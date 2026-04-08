import { NextRequest } from "next/server";
import {
  getPlatformSupabaseServerClient,
  getPlatformUserOrNull,
} from "@/lib/platform-supabase-server";

type AgentRow = {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Draft";
  created_at: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const { id } = await params;
    if (!id?.trim()) {
      return new Response(JSON.stringify({ error: "Agent not found." }), { status: 404 });
    }

    const supabase = getPlatformSupabaseServerClient(req);
    const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Agent not found." }), { status: 404 });
      }
      // eslint-disable-next-line no-console
      console.error("[/api/agents/[id]] Supabase GET error", error);
      return new Response(
        JSON.stringify({ error: "Failed to load agent.", detail: error.message }),
        { status: 500 }
      );
    }

    const agent = data as AgentRow;
    return new Response(JSON.stringify({ agent }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[/api/agents/[id]] Unexpected GET error", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Unexpected error while loading agent.", detail: message }),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const { id } = await params;
    if (!id?.trim()) {
      return new Response(JSON.stringify({ error: "Agent not found." }), { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const name = body?.name;
    const description = body?.description;
    const status = body?.status as AgentRow["status"] | undefined;

    const updates: Partial<Pick<AgentRow, "name" | "description" | "status">> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return new Response(JSON.stringify({ error: "Invalid 'name'." }), { status: 400 });
      }
      updates.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string") {
        return new Response(JSON.stringify({ error: "Invalid 'description'." }), { status: 400 });
      }
      updates.description = description;
    }
    if (status !== undefined) {
      if (status !== "Active" && status !== "Draft") {
        return new Response(JSON.stringify({ error: "Invalid 'status'." }), { status: 400 });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "No fields to update." }), { status: 400 });
    }

    const supabase = getPlatformSupabaseServerClient(req);
    const { data, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Agent not found." }), { status: 404 });
      }
      // eslint-disable-next-line no-console
      console.error("[/api/agents/[id]] Supabase PATCH error", error);
      return new Response(
        JSON.stringify({ error: "Failed to update agent.", detail: error.message }),
        { status: 500 }
      );
    }

    const agent = data as AgentRow;
    return new Response(JSON.stringify({ agent }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[/api/agents/[id]] Unexpected PATCH error", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: "Unexpected error while updating agent.", detail: message }),
      { status: 500 }
    );
  }
}
