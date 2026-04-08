import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import {
  deriveLegacyAvailabilityFromSchedule,
  normalizeAvailabilitySchedule,
  scheduleFromLegacyArrays,
  type AvailabilitySchedule,
} from "@/lib/zorenta/caregiver-availability-schedule";

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

function resolveAvailabilitySchedule(body: Record<string, unknown>): AvailabilitySchedule {
  if (hasKey(body, "availability_schedule") && body.availability_schedule != null) {
    return normalizeAvailabilitySchedule(body.availability_schedule);
  }
  return scheduleFromLegacyArrays(toStringArray(body.availability_days), toStringArray(body.availability_times));
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

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const schedule = resolveAvailabilitySchedule(body);
    const { availability_days, availability_times } = deriveLegacyAvailabilityFromSchedule(schedule);
    const payload = {
      profile_id: profileId,
      headline: trimText(body.headline),
      bio: trimText(body.bio),
      phone: trimText(body.phone),
      skills: toStringArray(body.skills),
      experience_years: typeof body.experience_years === "number" ? body.experience_years : null,
      availability: trimText(body.availability),
      city: trimText(body.city),
      region: trimText(body.region),
      country: trimText(body.country),
      certifications: toStringArray(body.certifications),
      hourly_rate: typeof body.hourly_rate === "number" ? body.hourly_rate : null,
      care_types: toStringArray(body.care_types),
      availability_schedule: schedule,
      availability_days: availability_days.length ? availability_days : null,
      availability_times: availability_times.length ? availability_times : null,
      travel_distance_km: typeof body.travel_distance_km === "number" ? body.travel_distance_km : null,
      has_driver_license: typeof body.has_driver_license === "boolean" ? body.has_driver_license : false,
      languages: toStringArray(body.languages),
      min_rate: typeof body.min_rate === "number" ? body.min_rate : null,
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

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (hasKey(body, "headline")) payload.headline = trimText(body.headline);
    if (hasKey(body, "bio")) payload.bio = trimText(body.bio);
    if (hasKey(body, "phone")) payload.phone = trimText(body.phone);
    if (hasKey(body, "skills")) payload.skills = toStringArray(body.skills);
    if (hasKey(body, "experience_years")) payload.experience_years = typeof body.experience_years === "number" ? body.experience_years : null;
    if (hasKey(body, "availability")) payload.availability = trimText(body.availability);
    if (hasKey(body, "city")) payload.city = trimText(body.city);
    if (hasKey(body, "region")) payload.region = trimText(body.region);
    if (hasKey(body, "country")) payload.country = trimText(body.country);
    if (hasKey(body, "certifications")) payload.certifications = toStringArray(body.certifications);
    if (hasKey(body, "hourly_rate")) payload.hourly_rate = typeof body.hourly_rate === "number" ? body.hourly_rate : null;
    if (hasKey(body, "care_types")) payload.care_types = toStringArray(body.care_types);
    if (hasKey(body, "availability_schedule") || hasKey(body, "availability_days") || hasKey(body, "availability_times")) {
      const schedule = resolveAvailabilitySchedule(body);
      payload.availability_schedule = schedule;
      const { availability_days, availability_times } = deriveLegacyAvailabilityFromSchedule(schedule);
      payload.availability_days = availability_days.length ? availability_days : null;
      payload.availability_times = availability_times.length ? availability_times : null;
    }
    if (hasKey(body, "travel_distance_km")) payload.travel_distance_km = typeof body.travel_distance_km === "number" ? body.travel_distance_km : null;
    if (hasKey(body, "has_driver_license")) payload.has_driver_license = typeof body.has_driver_license === "boolean" ? body.has_driver_license : null;
    if (hasKey(body, "languages")) payload.languages = toStringArray(body.languages);
    if (hasKey(body, "min_rate")) payload.min_rate = typeof body.min_rate === "number" ? body.min_rate : null;

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
