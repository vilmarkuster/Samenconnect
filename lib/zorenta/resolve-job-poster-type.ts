import type { SupabaseClient } from "@supabase/supabase-js";

export type JobPosterType = "client" | "organization";

/**
 * Bepaalt `care_jobs.poster_type` voor een ingelogde gebruiker.
 * Organisatie-contacten kunnen `profiles.role = 'client'` hebben terwijl er wél een
 * `organization_profiles`-rij bestaat — die moeten als `organization` posten.
 */
export async function resolveJobPosterType(
  supabase: SupabaseClient,
  userId: string,
  profileRole: string
): Promise<JobPosterType | null> {
  const r = (profileRole || "").trim().toLowerCase();
  if (r === "organization") return "organization";
  if (r === "client") {
    const { data: org } = await supabase
      .from("organization_profiles")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    return org ? "organization" : "client";
  }
  return null;
}
