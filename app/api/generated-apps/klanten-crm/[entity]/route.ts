import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

const ENTITIES = ["companies", "contacts", "deals", "tasks", "activities"] as const;

function isEntity(s: string): s is (typeof ENTITIES)[number] {
  return ENTITIES.includes(s as (typeof ENTITIES)[number]);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params;
    if (!isEntity(entity)) {
      return new Response(JSON.stringify({ error: "Invalid entity." }), { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(entity)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message, data: [] }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ data: data ?? [] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed", data: [] }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  try {
    const { entity } = await params;
    if (!isEntity(entity)) {
      return new Response(JSON.stringify({ error: "Invalid entity." }), { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseClient();

    const insertPayload: Record<string, unknown> = { ...body };
    delete insertPayload.id;
    delete insertPayload.created_at;

    const { data, error } = await supabase
      .from(entity)
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Create failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
