import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/zorenta/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const q = searchParams.get("q") || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    let query = supabase
      .from("care_jobs")
      .select("id, poster_id, poster_type, title, city, care_type, status, created_at, featured_until", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ["open", "closed", "filled"].includes(status)) {
      query = query.eq("status", status);
    }
    if (q.trim()) {
      query = query.or(`title.ilike.%${q.trim()}%,city.ilike.%${q.trim()}%`);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const posterIds = [...new Set((jobs ?? []).map((j) => j.poster_id))];
    const { data: posterProfiles } =
      posterIds.length > 0
        ? await supabase.from("profiles").select("id, display_name").in("id", posterIds)
        : { data: [] };

    const posterMap: Record<string, { display_name: string | null }> = {};
    (posterProfiles ?? []).forEach((p: { id: string; display_name: string | null }) => {
      posterMap[p.id] = { display_name: p.display_name };
    });

    const list = (jobs ?? []).map((j) => ({
      ...j,
      poster: posterMap[j.poster_id] ?? null,
    }));

    return new Response(
      JSON.stringify({ jobs: list, total: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
