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

export async function GET(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/agents] Supabase GET error", error);
      return new Response(
        JSON.stringify({ error: "Failed to load agents.", detail: error.message }),
        { status: 500 }
      );
    }

    const agents: AgentRow[] = (data ?? []) as AgentRow[];

    return new Response(JSON.stringify({ agents }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/agents] Unexpected GET error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while loading agents.",
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
    const description: string | undefined = body?.description ?? "";
    const status: AgentRow["status"] = body?.status ?? "Draft";

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'name'." }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name,
        description,
        status
      })
      .select("*")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/agents] Supabase POST error", error);
      return new Response(
        JSON.stringify({ error: "Failed to create agent.", detail: error.message }),
        { status: 500 }
      );
    }

    const agent = data as AgentRow;

    return new Response(JSON.stringify({ agent }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/agents] Unexpected POST error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while creating agent.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const id = idParam?.trim() ?? "";

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing 'id' in query string." }),
        { status: 400 }
      );
    }

    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/agents] Supabase DELETE error", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete agent.", detail: error.message }),
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/agents] Unexpected DELETE error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while deleting agent.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}


