import { NextRequest } from "next/server";
import { getSupabaseForAgentsApi } from "@/lib/agents-api-supabase";

const JSON_HEADERS = { "content-type": "application/json" } as const;

/**
 * Jobs owned by the current user (poster_id = auth.uid()), for Match Agent test runs from /agents.
 * Same auth as /api/agents/run (cookies or Bearer via getSupabaseForAgentsApi).
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseForAgentsApi(req);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const { data, error } = await supabase
    .from("care_jobs")
    .select("id, title, city, status, created_at")
    .eq("poster_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to load jobs.",
        detail: error.message,
      }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  return new Response(JSON.stringify({ jobs: data ?? [] }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
