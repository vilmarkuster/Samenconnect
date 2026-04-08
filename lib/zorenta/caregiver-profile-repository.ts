import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single query shape for `caregiver_profiles` by account id — shared by
 * `/api/zorenta/me` and `/api/zorenta/caregivers/[id]` linked path.
 */
export async function selectCaregiverProfileRowByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  return { data: data as Record<string, unknown> | null, error: null };
}

/** Dev-only: compare raw DB row between /me and public caregiver GET. */
export function devLogCaregiverProfileRawSource(
  label: string,
  profileId: string,
  row: Record<string, unknown> | null
): void {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console -- intentional dev comparison
  console.log(`[caregiver_profiles DB] ${label}`, {
    profileId,
    raw_hourly_rate: row?.hourly_rate,
    raw_skills: row?.skills,
    raw_care_types: row?.care_types,
    raw_certifications: row?.certifications,
    raw_languages: row?.languages,
    raw_availability_schedule: row?.availability_schedule,
    raw_travel_distance_km: row?.travel_distance_km,
    raw_has_driver_license: row?.has_driver_license,
    raw_min_rate: row?.min_rate,
    rawRowKeys: row ? Object.keys(row).sort() : [],
  });
}
