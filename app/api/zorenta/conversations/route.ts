import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, job_id, participant_1, participant_2, created_at, updated_at")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) return jsonResponse({ error: error.message }, 500);
  const convIds = (convos ?? []).map((c) => c.id);
  let lastMessages: Record<string, { body: string; created_at: string }> = {};
  if (convIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });
    const seen = new Set<string>();
    (msgs ?? []).forEach((m: { conversation_id: string; body: string; created_at: string }) => {
      if (!seen.has(m.conversation_id)) {
        seen.add(m.conversation_id);
        lastMessages[m.conversation_id] = { body: m.body, created_at: m.created_at };
      }
    });
  }
  const ids = [...new Set((convos ?? []).flatMap((c) => [c.participant_1, c.participant_2]).filter((id) => id !== userId))];
  const profiles = ids.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const profileMap = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p]));
  const list = (convos ?? []).map((c) => ({
    ...c,
    other: profileMap[c.participant_1 === userId ? c.participant_2 : c.participant_1],
    last_message: lastMessages[c.id] ?? null,
  }));
  return jsonResponse({ conversations: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const body = await req.json().catch(() => ({}));
  const otherId = body.other_user_id ?? body.applicant_id ?? body.poster_id;
  const jobId = body.job_id || null;
  if (!otherId) return jsonResponse({ error: "other_user_id or applicant_id/poster_id required." }, 400);
  const p1 = userId < otherId ? userId : otherId;
  const p2 = userId < otherId ? otherId : userId;
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .maybeSingle();
  if (existing) return jsonResponse(existing, 200);
  const { data, error } = await supabase
    .from("conversations")
    .insert({ participant_1: p1, participant_2: p2, job_id: jobId })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data, 201);
}
