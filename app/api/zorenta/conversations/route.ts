import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, job_id, application_id, participant_1, participant_2, created_at, updated_at")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) return jsonResponse({ error: error.message }, 500);
  const convIds = (convos ?? []).map((c) => c.id);
  let lastMessages: Record<string, { body: string; created_at: string }> = {};
  let unreadCounts: Record<string, number> = {};
  if (convIds.length > 0) {
    // Latest message per conversation (global desc order). Use a high limit so we are not
    // truncated by PostgREST default max rows when many conversations exist.
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(10_000);
    const seen = new Set<string>();
    (msgs ?? []).forEach((m: { conversation_id: string; body: string; created_at: string }) => {
      if (!seen.has(m.conversation_id)) {
        seen.add(m.conversation_id);
        lastMessages[m.conversation_id] = { body: m.body, created_at: m.created_at };
      }
    });

    /**
     * unread_count (authoritative, per conversation):
     *   COUNT(*) WHERE conversation_id IN convIds AND sender_id <> current user AND read_at IS NULL
     * (incoming only; own messages never count as unread).
     */
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, read_at")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("read_at", null);

    (unreadRows ?? []).forEach((m: { id: string; conversation_id: string; sender_id: string | null }) => {
      unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] ?? 0) + 1;
    });

    // Temporary: log a bounded sample of *incoming* rows (read + unread) to compare read_at vs counted.
    const { data: incomingSample } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, read_at")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    (incomingSample ?? []).forEach((m: {
      id: string;
      conversation_id: string;
      sender_id: string | null;
      read_at: string | null;
    }) => {
      const counted = m.read_at == null;
      // eslint-disable-next-line no-console -- temporary unread debug
      console.log("[zorenta-conversations unread row]", {
        conversation_id: m.conversation_id,
        message_id: m.id,
        sender_id: m.sender_id,
        read_at: m.read_at,
        counted_as_unread: counted,
      });
    });
  }
  const jobIds = [...new Set((convos ?? []).map((c) => c.job_id).filter(Boolean))] as string[];
  const jobs = jobIds.length
    ? await supabase.from("care_jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  const jobMap = Object.fromEntries((jobs.data ?? []).map((j) => [j.id, j]));
  const ids = [...new Set((convos ?? []).flatMap((c) => [c.participant_1, c.participant_2]).filter((id) => id !== userId))];
  const profiles = ids.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p]));
  const list = (convos ?? []).map((c) => ({
    ...c,
    other: profileMap[c.participant_1 === userId ? c.participant_2 : c.participant_1],
    job: c.job_id ? (jobMap[c.job_id] ?? null) : null,
    unread_count: unreadCounts[c.id] ?? 0,
    last_message: lastMessages[c.id] ?? null,
  })).sort((a, b) => {
    const aIso = a.last_message?.created_at ?? a.updated_at ?? "";
    const bIso = b.last_message?.created_at ?? b.updated_at ?? "";
    const aTs = Date.parse(aIso);
    const bTs = Date.parse(bIso);
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  return jsonResponse({ conversations: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const body = await req.json().catch(() => ({}));
  const otherId = body.other_user_id ?? body.applicant_id ?? body.poster_id;
  const jobId = body.job_id || null;
  const applicationId = body.application_id || null;
  if (!otherId) return jsonResponse({ error: "other_user_id or applicant_id/poster_id required." }, 400);
  const p1 = userId < otherId ? userId : otherId;
  const p2 = userId < otherId ? otherId : userId;

  // Application-scoped: reuse only by application_id (no participants-only fallback).
  if (applicationId) {
    const { data: forApplication } = await supabase
      .from("conversations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();
    if (forApplication) {
      return jsonResponse({ id: forApplication.id, created: false }, 200);
    }
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: p1,
        participant_2: p2,
        job_id: jobId,
        application_id: applicationId,
      })
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ id: data.id, created: true }, 201);
  }

  // Legacy: no application_id — at most one conversation per pair without application link.
  const { data: legacy } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .is("application_id", null)
    .maybeSingle();
  if (legacy) {
    if (jobId) {
      await supabase
        .from("conversations")
        .update({
          job_id: jobId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", legacy.id);
    }
    return jsonResponse({ id: legacy.id, created: false }, 200);
  }
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      participant_1: p1,
      participant_2: p2,
      job_id: jobId,
      application_id: null,
    })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ id: data.id, created: true }, 201);
}
