import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // "my" | "job" | null (all mine)
  const jobId = searchParams.get("job_id");

  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  if (profile.role === "caregiver") {
    const { data: apps, error, count } = await supabase
      .from("job_applications")
      .select("*, care_jobs(id, title, status)", { count: "exact" })
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ applications: apps ?? [], total: count ?? 0, limit, offset });
  }

  if (jobId) {
    const { data: job } = await supabase.from("care_jobs").select("poster_id").eq("id", jobId).single();
    if (!job || job.poster_id !== userId) return jsonResponse({ error: "Forbidden." }, 403);
    const { data: apps, error, count } = await supabase
      .from("job_applications")
      .select("*, care_jobs(id, title, status)", { count: "exact" })
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    const applicantIds = [...new Set((apps ?? []).map((a: { applicant_id: string }) => a.applicant_id))];
    const { data: profs } = applicantIds.length ? await supabase.from("profiles").select("id, display_name").in("id", applicantIds) : { data: [] };
    const profileMap = Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]));
    const applications = (apps ?? []).map((a: { applicant_id: string }) => ({ ...a, profiles: profileMap[a.applicant_id] ?? null }));
    return jsonResponse({ applications, total: count ?? 0, limit, offset });
  }

  const { data: myJobs } = await supabase.from("care_jobs").select("id").eq("poster_id", userId);
  const ids = (myJobs ?? []).map((j: { id: string }) => j.id);
  if (ids.length === 0) return jsonResponse({ applications: [], total: 0, limit, offset });
  const { data: apps, error, count } = await supabase
    .from("job_applications")
    .select("*, care_jobs(id, title, status)", { count: "exact" })
    .in("job_id", ids)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return jsonResponse({ error: error.message }, 500);
  const applicantIds = [...new Set((apps ?? []).map((a: { applicant_id: string }) => a.applicant_id))];
  const { data: profs } = applicantIds.length ? await supabase.from("profiles").select("id, display_name").in("id", applicantIds) : { data: [] };
  const profileMap = Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]));
  const applications = (apps ?? []).map((a: { applicant_id: string }) => ({ ...a, profiles: profileMap[a.applicant_id] ?? null }));
  return jsonResponse({ applications, total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "caregiver") return jsonResponse({ error: "Only caregivers can apply." }, 403);
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;
    if (!jobId) return jsonResponse({ error: "job_id is required." }, 400);
    const { data: job } = await supabase.from("care_jobs").select("id, status").eq("id", jobId).single();
    if (!job || job.status !== "open") return jsonResponse({ error: "Job not found or not open." }, 400);
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        applicant_id: userId,
        message: body.message ? String(body.message).trim() : null,
        status: "pending",
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return jsonResponse({ error: "You already applied to this job." }, 409);
      return jsonResponse({ error: error.message }, 500);
    }
    return jsonResponse(data, 201);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Request failed" }, 500);
  }
}
