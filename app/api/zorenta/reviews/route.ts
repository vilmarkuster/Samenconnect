import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const revieweeId = req.nextUrl.searchParams.get("reviewee_id");
  if (!revieweeId) return jsonResponse({ error: "reviewee_id required." }, 400);
  const jobId = req.nextUrl.searchParams.get("job_id");
  const reviewerId = req.nextUrl.searchParams.get("reviewer_id");
  const token = getAccessTokenFromRequest(req);
  const supabase = getZorentaSupabaseClient(token);
  let q = supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id, job_id")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });
  if (jobId) q = q.eq("job_id", jobId);
  if (reviewerId && reviewerId.trim()) q = q.eq("reviewer_id", reviewerId.trim());
  const { data, error } = await q;
  if (error) return jsonResponse({ error: error.message }, 500);
  let aggQ = supabase.from("reviews").select("rating").eq("reviewee_id", revieweeId);
  if (jobId) aggQ = aggQ.eq("job_id", jobId);
  const { data: agg } = await aggQ;
  const ratings = (agg ?? []).map((r) => r.rating).filter((n) => n != null);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return jsonResponse({
    reviews: data ?? [],
    average: average ? Math.round(average * 10) / 10 : null,
    count: ratings.length,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  const body = await req.json().catch(() => ({}));
  const revieweeId = typeof body.reviewee_id === "string" ? body.reviewee_id.trim() : "";
  const rating = body.rating;
  const jobId = typeof body.job_id === "string" ? body.job_id.trim() : "";
  if (!revieweeId || typeof rating !== "number" || rating < 1 || rating > 5) {
    return jsonResponse({ error: "reviewee_id en rating (1–5) zijn verplicht." }, 400);
  }
  if (!jobId) {
    return jsonResponse({ error: "job_id is verplicht voor een review." }, 400);
  }
  if (revieweeId === userId) {
    return jsonResponse({ error: "Je kunt jezelf niet beoordelen." }, 400);
  }

  const { data: job, error: jobErr } = await supabase
    .from("care_jobs")
    .select("id, poster_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) return jsonResponse({ error: jobErr.message }, 500);
  if (!job) return jsonResponse({ error: "Opdracht niet gevonden." }, 404);
  if (job.status !== "filled") {
    return jsonResponse({ error: "Reviews zijn alleen mogelijk na een afgeronde opdracht." }, 400);
  }

  const posterId = String((job as { poster_id: string }).poster_id);
  const role = profile.role;

  let allowed = false;
  if (userId === posterId) {
    if (role !== "client" && role !== "organization") {
      return jsonResponse({ error: "Alleen opdrachtgevers kunnen de zorgverlener beoordelen." }, 403);
    }
    const { data: accepted } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", revieweeId)
      .eq("status", "accepted")
      .maybeSingle();
    allowed = Boolean(accepted);
    if (!allowed) {
      return jsonResponse({ error: "Geen geaccepteerde sollicitant voor deze opdracht." }, 403);
    }
  } else if (role === "caregiver") {
    const { data: accepted } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", userId)
      .eq("status", "accepted")
      .maybeSingle();
    if (!accepted) {
      return jsonResponse({ error: "Je kunt alleen reviewen voor opdrachten waar je geaccepteerd bent." }, 403);
    }
    if (revieweeId !== posterId) {
      return jsonResponse({ error: "Ongeldige ontvanger voor deze review." }, 400);
    }
    allowed = true;
  } else {
    return jsonResponse({ error: "Geen toestemming om te reviewen." }, 403);
  }

  if (!allowed) {
    return jsonResponse({ error: "Review niet toegestaan." }, 403);
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      reviewer_id: userId,
      reviewee_id: revieweeId,
      job_id: jobId,
      rating,
      comment: body.comment ? String(body.comment).trim() : null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      return jsonResponse({ error: "Je hebt voor deze opdracht al een review geplaatst." }, 409);
    }
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse(data, 201);
}
