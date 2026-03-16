import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const revieweeId = req.nextUrl.searchParams.get("reviewee_id");
  if (!revieweeId) return jsonResponse({ error: "reviewee_id required." }, 400);
  const token = getAccessTokenFromRequest(req);
  const supabase = getZorentaSupabaseClient(token);
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });
  if (error) return jsonResponse({ error: error.message }, 500);
  const { data: agg } = await supabase.from("reviews").select("rating").eq("reviewee_id", revieweeId);
  const ratings = (agg ?? []).map((r) => r.rating).filter((n) => n != null);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return jsonResponse({ reviews: data ?? [], average: average ? Math.round(average * 10) / 10 : null, count: ratings.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "client" && profile.role !== "organization") return jsonResponse({ error: "Only clients and organizations can leave reviews." }, 403);
  const body = await req.json().catch(() => ({}));
  const revieweeId = body.reviewee_id;
  const rating = body.rating;
  const jobId = body.job_id || null;
  if (!revieweeId || typeof rating !== "number" || rating < 1 || rating > 5)
    return jsonResponse({ error: "reviewee_id and rating (1-5) required." }, 400);
  const { data, error } = await supabase
    .from("reviews")
    .insert({ reviewer_id: userId, reviewee_id: revieweeId, job_id: jobId, rating, comment: body.comment ? String(body.comment).trim() : null })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return jsonResponse({ error: "You already reviewed this caregiver for this job." }, 409);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse(data, 201);
}
