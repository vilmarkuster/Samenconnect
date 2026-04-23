import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { normalizeNotificationLink } from "@/lib/zorenta/normalize-notification-link";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  let q = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (unreadOnly) q = q.is("read_at", null);
  const { data, error } = await q;
  if (error) return jsonResponse({ error: error.message }, 500);
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const notifications = rows.map((row) => {
    const link = typeof row.link === "string" ? row.link : null;
    const normalized = normalizeNotificationLink(link);
    return normalized === link ? row : { ...row, link: normalized };
  });
  return jsonResponse({ notifications });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const body = await req.json().catch(() => ({}));
  const id = body.id;
  if (id) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data);
  }
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true });
}
