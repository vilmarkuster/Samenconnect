import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabase
      .from("care_intakes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse(data);
  }
  const { data, error } = await supabase
    .from("care_intakes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ intakes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "client" && profile.role !== "organization") {
    return jsonResponse({ error: "Alleen cliënten kunnen een intake invullen." }, 403);
  }
  const body = await req.json().catch(() => ({}));
  const payload = {
    user_id: userId,
    who_needs_care: body.who_needs_care ? String(body.who_needs_care).trim() : null,
    age_group: body.age_group ? String(body.age_group).trim() : null,
    care_type: body.care_type ? String(body.care_type).trim() : null,
    care_frequency: body.care_frequency ? String(body.care_frequency).trim() : null,
    preferred_schedule: body.preferred_schedule ? String(body.preferred_schedule).trim() : null,
    preferred_city: body.preferred_city ? String(body.preferred_city).trim() : null,
    preferred_region: body.preferred_region ? String(body.preferred_region).trim() : null,
    preferred_country: body.preferred_country ? String(body.preferred_country).trim() : null,
    urgency: body.urgency ? String(body.urgency).trim() : null,
    skills_required: Array.isArray(body.skills_required) ? body.skills_required.filter((s: unknown) => typeof s === "string") : null,
    language_preference: body.language_preference ? String(body.language_preference).trim() : null,
    budget_min: body.budget_min != null && body.budget_min !== "" ? Number(body.budget_min) : null,
    budget_max: body.budget_max != null && body.budget_max !== "" ? Number(body.budget_max) : null,
    notes: body.notes ? String(body.notes).trim() : null,
    status: body.status === "completed" ? "completed" : "draft",
    updated_at: new Date().toISOString(),
  };
  const id = body.id;
  if (id) {
    const { data, error } = await supabase
      .from("care_intakes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data);
  }
  const { data, error } = await supabase.from("care_intakes").insert(payload).select().single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data, 201);
}
