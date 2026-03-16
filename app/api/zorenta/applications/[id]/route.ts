import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { id } = await params;
  const { data, error } = await supabase
    .from("job_applications")
    .select("*, care_jobs(*), profiles!job_applications_applicant_id_fkey(id, display_name)")
    .eq("id", id)
    .single();
  if (error || !data) return jsonResponse({ error: "Not found." }, 404);
  const isApplicant = data.applicant_id === userId;
  const { data: job } = await supabase.from("care_jobs").select("poster_id").eq("id", data.job_id).single();
  const isPoster = job?.poster_id === userId;
  if (!isApplicant && !isPoster) return jsonResponse({ error: "Forbidden." }, 403);
  return jsonResponse(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { id } = await params;
  const { data: app } = await supabase.from("job_applications").select("applicant_id, job_id, status").eq("id", id).single();
  if (!app) return jsonResponse({ error: "Not found." }, 404);
  const { data: job } = await supabase.from("care_jobs").select("poster_id").eq("id", app.job_id).single();
  const isPoster = job?.poster_id === userId;
  const isApplicant = app.applicant_id === userId;
  const body = await req.json().catch(() => ({}));
  const newStatus = body.status;

  if (isApplicant && ["pending", "shortlisted"].includes((app as { status?: string }).status ?? "")) {
    if (newStatus === "withdrawn" || newStatus === "rejected") {
      const { data, error } = await supabase
        .from("job_applications")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return jsonResponse({ error: error.message }, 500);
      return jsonResponse(data);
    }
  }

  if (isPoster && ["pending", "shortlisted", "accepted", "rejected"].includes(newStatus)) {
    const { data, error } = await supabase
      .from("job_applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);

    let conversationId: string | null = null;
    if (newStatus === "accepted" && job) {
      const posterId = job.poster_id;
      const applicantId = app.applicant_id;
      const p1 = posterId < applicantId ? posterId : applicantId;
      const p2 = posterId < applicantId ? applicantId : posterId;
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_1", p1)
        .eq("participant_2", p2)
        .maybeSingle();
      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: created, error: convErr } = await supabase
          .from("conversations")
          .insert({ participant_1: p1, participant_2: p2, job_id: app.job_id })
          .select("id")
          .single();
        if (!convErr && created) conversationId = created.id;
      }
    }
    return jsonResponse({ ...data, conversation_id: conversationId ?? undefined });
  }

  return jsonResponse({ error: "Forbidden or invalid status." }, 403);
}
