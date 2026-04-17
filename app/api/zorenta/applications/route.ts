import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import {
  conversationIdForApplication,
  ensureApplicationIntroMessage,
  ensureConversationForJobApplication,
} from "@/lib/zorenta/application-conversation";

/** Same rule as inbox / public profile page: only `caregiver_profiles` ⇒ renderbare `/caregivers/[id]`. */
async function withApplicantRenderablePublicProfile(
  supabase: SupabaseClient,
  applications: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const applicantIds = [
    ...new Set(
      applications
        .map((a) => {
          const id = (a as { applicant_id?: string | null }).applicant_id;
          return typeof id === "string" && id.trim() ? id.trim() : "";
        })
        .filter(Boolean)
    ),
  ];
  if (applicantIds.length === 0) {
    return applications.map((a) => ({ ...a, applicant_has_renderable_public_profile: false }));
  }
  const { data: cpRows } = await supabase
    .from("caregiver_profiles")
    .select("profile_id")
    .in("profile_id", applicantIds);
  const withCaregiverRow = new Set(
    (cpRows ?? []).map((r: { profile_id: string }) => r.profile_id)
  );
  return applications.map((a) => {
    const aid = (a as { applicant_id?: string | null }).applicant_id;
    const id = typeof aid === "string" ? aid.trim() : "";
    return {
      ...a,
      applicant_has_renderable_public_profile: id.length > 0 && withCaregiverRow.has(id),
    };
  });
}

async function withConversationIds(
  supabase: SupabaseClient,
  applications: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const ids = applications.map((a) => a.id as string).filter(Boolean);
  if (ids.length === 0) return applications;
  const { data: convs } = await supabase.from("conversations").select("id, application_id").in("application_id", ids);
  const map = Object.fromEntries(
    (convs ?? []).map((c: { id: string; application_id: string }) => [c.application_id, c.id])
  );
  return applications.map((a) => ({ ...a, conversation_id: map[a.id as string] ?? null }));
}

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");

  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  if (profile.role === "caregiver") {
    const { data: apps, error, count } = await supabase
      .from("job_applications")
      .select("*, care_jobs(id, title, status, poster_id)", { count: "exact" })
      .eq("applicant_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    const flagged = await withApplicantRenderablePublicProfile(supabase, apps ?? []);
    const enriched = await withConversationIds(supabase, flagged);
    return jsonResponse({ applications: enriched, total: count ?? 0, limit, offset });
  }

  if (jobId) {
    const { data: job } = await supabase.from("care_jobs").select("poster_id").eq("id", jobId).single();
    if (!job || job.poster_id !== userId) return jsonResponse({ error: "Forbidden." }, 403);
    const { data: apps, error, count } = await supabase
      .from("job_applications")
      .select("*, care_jobs(id, title, status, poster_id)", { count: "exact" })
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    const applicantIds = [...new Set((apps ?? []).map((a: { applicant_id: string }) => a.applicant_id))];
    const { data: profs } = applicantIds.length ? await supabase.from("profiles").select("id, display_name").in("id", applicantIds) : { data: [] };
    const profileMap = Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]));
    const withProfiles = (apps ?? []).map((a: { applicant_id: string }) => ({
      ...a,
      profiles: profileMap[a.applicant_id] ?? null,
    }));
    const flagged = await withApplicantRenderablePublicProfile(supabase, withProfiles);
    const enriched = await withConversationIds(supabase, flagged);
    return jsonResponse({ applications: enriched, total: count ?? 0, limit, offset });
  }

  const { data: myJobs } = await supabase.from("care_jobs").select("id").eq("poster_id", userId);
  const ids = (myJobs ?? []).map((j: { id: string }) => j.id);
  if (ids.length === 0) return jsonResponse({ applications: [], total: 0, limit, offset });
  const { data: apps, error, count } = await supabase
    .from("job_applications")
    .select("*, care_jobs(id, title, status, poster_id)", { count: "exact" })
    .in("job_id", ids)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return jsonResponse({ error: error.message }, 500);
  const applicantIds = [...new Set((apps ?? []).map((a: { applicant_id: string }) => a.applicant_id))];
  const { data: profs } = applicantIds.length ? await supabase.from("profiles").select("id, display_name").in("id", applicantIds) : { data: [] };
  const profileMap = Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]));
  const withProfiles = (apps ?? []).map((a: { applicant_id: string }) => ({
    ...a,
    profiles: profileMap[a.applicant_id] ?? null,
  }));
  const flagged = await withApplicantRenderablePublicProfile(supabase, withProfiles);
  const enriched = await withConversationIds(supabase, flagged);
  return jsonResponse({ applications: enriched, total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "caregiver") return jsonResponse({ error: "Only caregivers can apply." }, 403);
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;
    const messageRaw = body.message != null ? String(body.message) : "";
    const message = messageRaw.trim();
    if (!jobId) return jsonResponse({ error: "job_id is required." }, 400);
    if (!message) return jsonResponse({ error: "Voeg een korte motivatie toe." }, 400);

    const { data: job } = await supabase.from("care_jobs").select("id, status, poster_id").eq("id", jobId).single();
    if (!job || job.status !== "open") return jsonResponse({ error: "Job not found or not open." }, 400);

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        applicant_id: userId,
        message,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("job_applications")
          .select("id, message")
          .eq("job_id", jobId)
          .eq("applicant_id", userId)
          .maybeSingle();
        if (existing) {
          let conversationId: string | null = await conversationIdForApplication(supabase, existing.id);
          try {
            if (!conversationId) {
              conversationId = await ensureConversationForJobApplication(supabase, {
                applicationId: existing.id,
                jobId,
                applicantId: userId,
                posterId: job.poster_id,
              });
            }
            const intro = String(existing.message ?? "").trim();
            if (conversationId && intro) {
              await ensureApplicationIntroMessage(supabase, {
                conversationId,
                applicantId: userId,
                body: intro,
              });
            }
          } catch {
            /* best-effort for legacy rows */
          }
          return jsonResponse(
            {
              error: "Je hebt al gesolliciteerd op deze vacature.",
              conversation_id: conversationId,
              application_id: existing.id,
            },
            409
          );
        }
      }
      return jsonResponse({ error: error.message }, 500);
    }

    let conversationId: string;
    try {
      conversationId = await ensureConversationForJobApplication(supabase, {
        applicationId: data.id,
        jobId,
        applicantId: userId,
        posterId: job.poster_id,
      });
      await ensureApplicationIntroMessage(supabase, {
        conversationId,
        applicantId: userId,
        body: message,
      });
    } catch (e) {
      await supabase.from("job_applications").delete().eq("id", data.id);
      return jsonResponse(
        { error: e instanceof Error ? e.message : "Kon het gesprek niet starten. Probeer het opnieuw." },
        500
      );
    }

    return jsonResponse({ ...data, conversation_id: conversationId }, 201);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Request failed" }, 500);
  }
}
