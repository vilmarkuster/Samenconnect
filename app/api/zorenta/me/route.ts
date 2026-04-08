import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { normalizeCaregiverProfileRow } from "@/lib/zorenta/normalize-caregiver-profile-display";
import {
  devLogCaregiverProfileRawSource,
  selectCaregiverProfileRowByProfileId,
} from "@/lib/zorenta/caregiver-profile-repository";
import { getSupabaseServiceRoleClient } from "@/lib/zorenta/supabase-service-role";

function hasKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function toStringArrayOrNull(v: unknown): string[] | null {
  if (v === null) return null;
  return toStringArray(v);
}

function trimText(v: unknown): string | null {
  return typeof v === "string" ? v.trim() || null : null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = getZorentaSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ profile: null, email: user.email ?? null }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const out: { profile: typeof profile; caregiver?: unknown; client?: unknown; organization?: unknown; authUserId: string; email: string | null } = {
      profile,
      authUserId: user.id,
      email: user.email ?? null,
    };
    if (profile.role === "caregiver") {
      const cpSupabase = getSupabaseServiceRoleClient() ?? supabase;
      const { data: cp, error: cpErr } = await selectCaregiverProfileRowByProfileId(cpSupabase, profile.id);
      if (cpErr) {
        return new Response(JSON.stringify({ error: cpErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      devLogCaregiverProfileRawSource("GET /api/zorenta/me", profile.id, cp);
      out.caregiver = cp ? normalizeCaregiverProfileRow(cp, { includePrivateContact: true }) : null;
    } else if (profile.role === "client") {
      const { data: cp } = await supabase.from("client_profiles").select("*").eq("profile_id", profile.id).single();
      out.client = cp ?? null;
    } else if (profile.role === "organization") {
      const { data: op } = await supabase.from("organization_profiles").select("*").eq("profile_id", profile.id).single();
      out.organization = op ?? null;
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = getZorentaSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const updates: { display_name?: string | null; avatar_url?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(body, "display_name")) {
      updates.display_name = typeof body.display_name === "string" ? body.display_name.trim() || null : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "avatar_url")) {
      updates.avatar_url = typeof body.avatar_url === "string" ? body.avatar_url.trim() || null : null;
    }

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let roleProfile: unknown = null;
    if (profile.role === "client") {
      const clientUpdates: Record<string, unknown> = {};
      if (hasKey(body, "headline")) clientUpdates.headline = trimText(body.headline);
      if (hasKey(body, "care_needs")) clientUpdates.care_needs = trimText(body.care_needs);
      if (hasKey(body, "preferred_location")) clientUpdates.preferred_location = trimText(body.preferred_location);
      if (hasKey(body, "phone")) clientUpdates.phone = trimText(body.phone);
      if (hasKey(body, "postcode")) clientUpdates.postcode = trimText(body.postcode);
      if (hasKey(body, "city")) clientUpdates.city = trimText(body.city);
      if (hasKey(body, "region")) clientUpdates.region = trimText(body.region);
      if (hasKey(body, "country")) clientUpdates.country = trimText(body.country);
      if (hasKey(body, "care_types")) clientUpdates.care_types = toStringArray(body.care_types);
      if (hasKey(body, "frequency")) clientUpdates.frequency = trimText(body.frequency);
      if (hasKey(body, "hours_per_week")) clientUpdates.hours_per_week = typeof body.hours_per_week === "number" ? body.hours_per_week : null;
      if (hasKey(body, "preferred_days")) clientUpdates.preferred_days = toStringArray(body.preferred_days);
      if (hasKey(body, "preferred_times")) clientUpdates.preferred_times = toStringArray(body.preferred_times);
      if (hasKey(body, "start_date")) clientUpdates.start_date = trimText(body.start_date);
      if (hasKey(body, "budget_min")) clientUpdates.budget_min = typeof body.budget_min === "number" ? body.budget_min : null;
      if (hasKey(body, "budget_max")) clientUpdates.budget_max = typeof body.budget_max === "number" ? body.budget_max : null;
      if (hasKey(body, "caregiver_preferences")) clientUpdates.caregiver_preferences = toStringArray(body.caregiver_preferences);
      if (hasKey(body, "urgency")) clientUpdates.urgency = trimText(body.urgency);
      if (hasKey(body, "extra_notes")) clientUpdates.extra_notes = trimText(body.extra_notes);
      if (Object.keys(clientUpdates).length > 0) {
        const { data: cp } = await supabase
          .from("client_profiles")
          .update({ ...clientUpdates, updated_at: new Date().toISOString() })
          .eq("profile_id", user.id)
          .select()
          .single();
        roleProfile = cp ?? null;
      }
    } else if (profile.role === "caregiver") {
      const caregiverUpdates: Record<string, unknown> = {};
      if (hasKey(body, "headline")) caregiverUpdates.headline = trimText(body.headline);
      if (hasKey(body, "bio")) caregiverUpdates.bio = trimText(body.bio);
      if (hasKey(body, "phone")) caregiverUpdates.phone = trimText(body.phone);
      if (hasKey(body, "skills")) caregiverUpdates.skills = toStringArray(body.skills);
      if (hasKey(body, "experience_years")) caregiverUpdates.experience_years = typeof body.experience_years === "number" ? body.experience_years : null;
      if (hasKey(body, "availability")) caregiverUpdates.availability = trimText(body.availability);
      if (hasKey(body, "city")) caregiverUpdates.city = trimText(body.city);
      if (hasKey(body, "region")) caregiverUpdates.region = trimText(body.region);
      if (hasKey(body, "country")) caregiverUpdates.country = trimText(body.country);
      if (hasKey(body, "certifications")) caregiverUpdates.certifications = toStringArray(body.certifications);
      if (hasKey(body, "hourly_rate")) caregiverUpdates.hourly_rate = typeof body.hourly_rate === "number" ? body.hourly_rate : null;
      if (hasKey(body, "care_types")) caregiverUpdates.care_types = toStringArray(body.care_types);
      if (hasKey(body, "availability_days")) caregiverUpdates.availability_days = toStringArrayOrNull(body.availability_days);
      if (hasKey(body, "availability_times")) caregiverUpdates.availability_times = toStringArrayOrNull(body.availability_times);
      if (hasKey(body, "travel_distance_km")) caregiverUpdates.travel_distance_km = typeof body.travel_distance_km === "number" ? body.travel_distance_km : null;
      if (hasKey(body, "has_driver_license")) caregiverUpdates.has_driver_license = typeof body.has_driver_license === "boolean" ? body.has_driver_license : null;
      if (hasKey(body, "languages")) caregiverUpdates.languages = toStringArray(body.languages);
      if (hasKey(body, "min_rate")) caregiverUpdates.min_rate = typeof body.min_rate === "number" ? body.min_rate : null;
      if (Object.keys(caregiverUpdates).length > 0) {
        const { data: cp } = await supabase
          .from("caregiver_profiles")
          .update({ ...caregiverUpdates, updated_at: new Date().toISOString() })
          .eq("profile_id", user.id)
          .select()
          .single();
        roleProfile = cp ?? null;
      }
    }

    return new Response(JSON.stringify({ profile, role_profile: roleProfile }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Update failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
