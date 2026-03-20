import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

type Body = {
  providerId?: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);

  const { supabase, userId } = auth;
  const body = (await req.json().catch(() => ({}))) as Body;
  const providerId = typeof body.providerId === "string" ? body.providerId : null;

  if (!providerId) return jsonResponse({ error: "providerId is required." }, 400);

  const { data: existing, error: existingErr } = await supabase
    .from("saved_providers")
    .select("id")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (existingErr) {
    return jsonResponse({ error: existingErr.message }, 500);
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from("saved_providers")
      .delete()
      .eq("user_id", userId)
      .eq("provider_id", providerId);

    if (delErr) return jsonResponse({ error: delErr.message }, 500);
    return jsonResponse({ status: "removed" }, 200);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("saved_providers")
    .insert({ user_id: userId, provider_id: providerId })
    .select("id")
    .single();

  if (insErr) {
    // Two rapid toggles can race and hit the unique index; treat it as "added".
    if ((insErr as any)?.code === "23505") {
      return jsonResponse({ status: "added", savedId: null }, 201);
    }
    return jsonResponse({ error: insErr.message }, 500);
  }
  return jsonResponse({ status: "added", savedId: inserted?.id ?? null }, 201);
}

