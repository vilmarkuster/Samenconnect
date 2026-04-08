import { NextRequest } from "next/server";
import { getPlatformSupabaseServerClient } from "@/lib/platform-supabase-server";

const JSON_HEADERS = { "content-type": "application/json" } as const;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("jobId");
    const jobId = typeof raw === "string" ? raw.trim() : "";

    if (!jobId) {
      return json({ error: "Missing required query parameter 'jobId'." }, 400);
    }

    const supabase = getPlatformSupabaseServerClient(req);

    const { data, error } = await supabase
      .from("agent_match_results")
      .select("id, agent_id, job_id, output, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[agent-match-results] Supabase error:", error.message, error);
      return json(
        {
          error: "Failed to load match results.",
          detail: error.message,
        },
        500
      );
    }

    if (!data) {
      return json(
        {
          output: null,
          agentId: null,
          jobId,
          createdAt: null,
        },
        200
      );
    }

    return json(
      {
        output: data.output,
        agentId: data.agent_id,
        jobId: data.job_id,
        createdAt: data.created_at,
      },
      200
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[agent-match-results] Unexpected error:", message, e);
    return json(
      {
        error: "Failed to load match results.",
        detail: message,
      },
      500
    );
  }
}
