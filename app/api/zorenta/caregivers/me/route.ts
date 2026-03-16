import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

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
      .from("caregiver_profiles")
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
      headline: typeof body.headline === "string" ? body.headline.trim() || null : null,
      bio: typeof body.bio === "string" ? body.bio.trim() || null : null,
      skills: Array.isArray(body.skills) ? body.skills.filter((s: unknown): s is string => typeof s === "string") : [],
      experience_years: typeof body.experience_years === "number" ? body.experience_years : null,
      availability: typeof body.availability === "string" ? body.availability.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      region: typeof body.region === "string" ? body.region.trim() || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null,
      certifications: typeof body.certifications === "string" ? body.certifications.trim() || null : null,
      hourly_rate: typeof body.hourly_rate === "number" ? body.hourly_rate : null,
    };

    const { data, error } = await supabase.from("caregiver_profiles").insert(payload).select().single();
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

    const body = await req.json().catch(() => ({}));
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (typeof body.headline === "string") payload.headline = body.headline.trim() || null;
    if (typeof body.bio === "string") payload.bio = body.bio.trim() || null;
    if (Array.isArray(body.skills)) payload.skills = body.skills.filter((s: unknown): s is string => typeof s === "string");
    if (typeof body.experience_years === "number") payload.experience_years = body.experience_years;
    if (typeof body.availability === "string") payload.availability = body.availability.trim() || null;
    if (typeof body.city === "string") payload.city = body.city.trim() || null;
    if (typeof body.region === "string") payload.region = body.region.trim() || null;
    if (typeof body.country === "string") payload.country = body.country.trim() || null;
    if (typeof body.certifications === "string") payload.certifications = body.certifications.trim() || null;
    if (typeof body.hourly_rate === "number") payload.hourly_rate = body.hourly_rate;

    const { data, error } = await supabase
      .from("caregiver_profiles")
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
