import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

function hasKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function trimText(v: unknown): string | null {
  return typeof v === "string" ? v.trim() || null : null;
}

async function getProfileId(supabase: ReturnType<typeof getZorentaSupabaseClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (error && error.code !== "PGRST116") {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ profile: data ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const payload = {
      profile_id: profileId,
      headline: trimText(body.headline),
      care_needs: trimText(body.care_needs),
      preferred_location: trimText(body.preferred_location),
      phone: trimText(body.phone),
      postcode: trimText(body.postcode),
      city: trimText(body.city),
      region: trimText(body.region),
      country: trimText(body.country),
      care_types: toStringArray(body.care_types),
      frequency: trimText(body.frequency),
      hours_per_week: typeof body.hours_per_week === "number" ? body.hours_per_week : null,
      preferred_days: toStringArray(body.preferred_days),
      preferred_times: toStringArray(body.preferred_times),
      start_date: trimText(body.start_date),
      budget_min: typeof body.budget_min === "number" ? body.budget_min : null,
      budget_max: typeof body.budget_max === "number" ? body.budget_max : null,
      caregiver_preferences: toStringArray(body.caregiver_preferences),
      urgency: trimText(body.urgency),
      extra_notes: trimText(body.extra_notes),
    };

    const { data, error } = await supabase.from("client_profiles").insert(payload).select().single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(data), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (hasKey(body, "headline")) payload.headline = trimText(body.headline);
    if (hasKey(body, "care_needs")) payload.care_needs = trimText(body.care_needs);
    if (hasKey(body, "preferred_location")) payload.preferred_location = trimText(body.preferred_location);
    if (hasKey(body, "phone")) payload.phone = trimText(body.phone);
    if (hasKey(body, "postcode")) payload.postcode = trimText(body.postcode);
    if (hasKey(body, "city")) payload.city = trimText(body.city);
    if (hasKey(body, "region")) payload.region = trimText(body.region);
    if (hasKey(body, "country")) payload.country = trimText(body.country);
    if (hasKey(body, "care_types")) payload.care_types = toStringArray(body.care_types);
    if (hasKey(body, "frequency")) payload.frequency = trimText(body.frequency);
    if (hasKey(body, "hours_per_week")) payload.hours_per_week = typeof body.hours_per_week === "number" ? body.hours_per_week : null;
    if (hasKey(body, "preferred_days")) payload.preferred_days = toStringArray(body.preferred_days);
    if (hasKey(body, "preferred_times")) payload.preferred_times = toStringArray(body.preferred_times);
    if (hasKey(body, "start_date")) payload.start_date = trimText(body.start_date);
    if (hasKey(body, "budget_min")) payload.budget_min = typeof body.budget_min === "number" ? body.budget_min : null;
    if (hasKey(body, "budget_max")) payload.budget_max = typeof body.budget_max === "number" ? body.budget_max : null;
    if (hasKey(body, "caregiver_preferences")) payload.caregiver_preferences = toStringArray(body.caregiver_preferences);
    if (hasKey(body, "urgency")) payload.urgency = trimText(body.urgency);
    if (hasKey(body, "extra_notes")) payload.extra_notes = trimText(body.extra_notes);

    const { data, error } = await supabase
      .from("client_profiles")
      .update(payload)
      .eq("profile_id", profileId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
