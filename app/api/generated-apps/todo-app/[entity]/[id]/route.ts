import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const ENTITIES = ["todos"];
const TABLE_MAP: Record<string, string> = {"todos":"todos"};

function isEntity(s: string): boolean {
  return ENTITIES.includes(s);
}

function getTable(s: string): string {
  return TABLE_MAP[s] ?? s.replace(/-/g, "_");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { data, error } = await supabase.from(table).select("*").eq("id", id).single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message ?? "Not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = { ...body };
    delete updatePayload.id;
    delete updatePayload.created_at;
    updatePayload.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { data, error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Update failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  try {
    const { entity, id } = await params;
    if (!isEntity(entity) || !id) {
      return new Response(JSON.stringify({ error: "Invalid entity or id." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const table = getTable(entity);
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Delete failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
