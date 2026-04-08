import type { SupabaseClient } from "@supabase/supabase-js";

export function orderedProfilePair(a: string, b: string): { participant_1: string; participant_2: string } {
  return a < b ? { participant_1: a, participant_2: b } : { participant_1: b, participant_2: a };
}

/**
 * Ensures exactly one conversation for this job application: prefers application_id,
 * else adopts a legacy row (same pair, application_id IS NULL, same job or NULL job_id),
 * else inserts a new row.
 */
export async function ensureConversationForJobApplication(
  supabase: SupabaseClient,
  params: {
    applicationId: string;
    jobId: string;
    applicantId: string;
    posterId: string;
  }
): Promise<string> {
  const { applicationId, jobId, applicantId, posterId } = params;
  const { participant_1, participant_2 } = orderedProfilePair(applicantId, posterId);

  const { data: byApp } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (byApp?.id) return byApp.id;

  const { data: legacy } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", participant_1)
    .eq("participant_2", participant_2)
    .is("application_id", null)
    .or(`job_id.eq.${jobId},job_id.is.null`)
    .maybeSingle();

  if (legacy?.id) {
    const { error: upErr } = await supabase
      .from("conversations")
      .update({
        application_id: applicationId,
        job_id: jobId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", legacy.id);
    if (upErr) throw new Error(upErr.message);
    return legacy.id;
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      participant_1,
      participant_2,
      job_id: jobId,
      application_id: applicationId,
    })
    .select("id")
    .single();
  if (!error && created?.id) return created.id;
  if (error?.code === "23505") {
    const { data: again } = await supabase
      .from("conversations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();
    if (again?.id) return again.id;
  }
  if (error) throw new Error(error.message);
  throw new Error("Conversation could not be created.");
}

/**
 * Idempotent: inserts the caregiver's intro message once (same body + sender dedupes retries).
 */
export async function ensureApplicationIntroMessage(
  supabase: SupabaseClient,
  params: { conversationId: string; applicantId: string; body: string }
): Promise<void> {
  const trimmed = params.body.trim();
  if (!trimmed) return;

  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", params.conversationId)
    .eq("sender_id", params.applicantId)
    .eq("body", trimmed)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    sender_id: params.applicantId,
    body: trimmed,
  });
  if (error) throw new Error(error.message);

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);
}

export async function conversationIdForApplication(
  supabase: SupabaseClient,
  applicationId: string
): Promise<string | null> {
  const { data } = await supabase.from("conversations").select("id").eq("application_id", applicationId).maybeSingle();
  return data?.id ?? null;
}
