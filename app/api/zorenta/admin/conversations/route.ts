import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/zorenta/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase } = auth;
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 100);
  const offset = Number(new URL(req.url).searchParams.get("offset")) || 0;

  try {
    const { data: conversations, error, count } = await supabase
      .from("conversations")
      .select("id, job_id, participant_1, participant_2, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const participantIds = [...new Set((conversations ?? []).flatMap((c) => [c.participant_1, c.participant_2]))];
    const jobIds = [...new Set((conversations ?? []).map((c) => c.job_id).filter(Boolean))];

    const [profilesRes, jobsRes, messageCountsRes] = await Promise.all([
      participantIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", participantIds)
        : { data: [] },
      jobIds.length ? supabase.from("care_jobs").select("id, title").in("id", jobIds) : { data: [] },
      supabase.from("messages").select("conversation_id"),
    ]);

    const profileMap: Record<string, string | null> = {};
    (profilesRes.data ?? []).forEach((p: { id: string; display_name: string | null }) => {
      profileMap[p.id] = p.display_name;
    });
    const jobMap: Record<string, string> = {};
    (jobsRes.data ?? []).forEach((j: { id: string; title: string }) => {
      jobMap[j.id] = j.title;
    });
    const messageCountByConv: Record<string, number> = {};
    (messageCountsRes.data ?? []).forEach((m: { conversation_id: string }) => {
      messageCountByConv[m.conversation_id] = (messageCountByConv[m.conversation_id] ?? 0) + 1;
    });

    const list = (conversations ?? []).map((c) => ({
      id: c.id,
      job_id: c.job_id,
      job_title: c.job_id ? jobMap[c.job_id] ?? null : null,
      participant_1: c.participant_1,
      participant_2: c.participant_2,
      participant_1_name: profileMap[c.participant_1] ?? null,
      participant_2_name: profileMap[c.participant_2] ?? null,
      created_at: c.created_at,
      message_count: messageCountByConv[c.id] ?? 0,
    }));

    return new Response(
      JSON.stringify({ conversations: list, total: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
