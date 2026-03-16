import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const convId = req.nextUrl.searchParams.get("conversation_id");
  if (!convId) return jsonResponse({ error: "conversation_id required." }, 400);
  const { data: conv } = await supabase.from("conversations").select("participant_1, participant_2").eq("id", convId).single();
  if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId))
    return jsonResponse({ error: "Forbidden." }, 403);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);
  const { data, error, count } = await supabase
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ messages: data ?? [], total: count ?? 0, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const body = await req.json().catch(() => ({}));
  const conversationId = body.conversation_id;
  const bodyText = body.body ?? body.message ?? "";
  if (!conversationId || !bodyText.trim()) return jsonResponse({ error: "conversation_id and body required." }, 400);
  const { data: conv } = await supabase.from("conversations").select("participant_1, participant_2").eq("id", conversationId).single();
  if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId))
    return jsonResponse({ error: "Forbidden." }, 403);
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: bodyText.trim() })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  return jsonResponse(data, 201);
}
