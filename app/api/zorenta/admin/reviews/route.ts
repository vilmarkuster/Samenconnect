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
  const rating = searchParams.get("rating") || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    let query = supabase
      .from("reviews")
      .select("id, reviewer_id, reviewee_id, job_id, rating, comment, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (rating) {
      const r = Number(rating);
      if (r >= 1 && r <= 5) query = query.eq("rating", r);
    }

    const { data: reviews, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
    const revieweeIds = [...new Set((reviews ?? []).map((r) => r.reviewee_id))];
    const allIds = [...new Set([...reviewerIds, ...revieweeIds])];

    const { data: profiles } =
      allIds.length > 0
        ? await supabase.from("profiles").select("id, display_name").in("id", allIds)
        : { data: [] };

    const profileMap: Record<string, { display_name: string | null }> = {};
    (profiles ?? []).forEach((p: { id: string; display_name: string | null }) => {
      profileMap[p.id] = { display_name: p.display_name };
    });

    const list = (reviews ?? []).map((r) => ({
      ...r,
      reviewer: profileMap[r.reviewer_id] ?? null,
      reviewee: profileMap[r.reviewee_id] ?? null,
    }));

    return new Response(
      JSON.stringify({ reviews: list, total: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
