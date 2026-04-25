import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

/**
 * Heartbeat: current user was active in this conversation (read thread, typed, etc.).
 * Updates `conversation_participant_activity.last_seen_at` for (conversation_id, profile_id).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { id: conversationId } = await params;
  if (!conversationId) return jsonResponse({ error: "conversation id required." }, 400);

  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) return jsonResponse({ error: convErr.message }, 500);
  if (!conv) return jsonResponse({ error: "Conversation not found." }, 404);
  const row = conv as { participant_1: string; participant_2: string };
  if (row.participant_1 !== userId && row.participant_2 !== userId) {
    return jsonResponse({ error: "Forbidden." }, 403);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("conversation_participant_activity").upsert(
    {
      conversation_id: conversationId,
      profile_id: userId,
      last_seen_at: now,
    },
    { onConflict: "conversation_id,profile_id" }
  );
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true, last_seen_at: now });
}
