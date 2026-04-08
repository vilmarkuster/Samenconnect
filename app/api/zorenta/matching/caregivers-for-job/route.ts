import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { scoreCaregiverForJob, type JobForScoring, type CaregiverForScoring } from "@/lib/zorenta/matching";
export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "client" && profile.role !== "organization") {
    return jsonResponse({ error: "Alleen voor opdrachtgevers." }, 403);
  }

  const jobId = req.nextUrl.searchParams.get("job_id");
  if (!jobId) return jsonResponse({ error: "job_id verplicht." }, 400);

  const { data: job, error: jobErr } = await supabase
    .from("care_jobs")
    .select(
      "id, title, city, region, country, care_type, care_context, financiering_regeling, soort_hulp_zorg, zorgniveau, type_inzet, vaardigheden_ervaring, role_sought, experience_requirements, certificates_requirements, schedule, availability, budget_min, budget_max, hourly_rate, poster_id"
    )
    .eq("id", jobId)
    .single();
  if (jobErr || !job || job.poster_id !== userId) {
    return jsonResponse({ error: "Vacature niet gevonden of geen toegang." }, 404);
  }

  const { data: caregivers } = await supabase
    .from("caregiver_profiles")
    .select("id, profile_id, headline, skills, experience_years, availability, city, region, country, hourly_rate")
    .limit(100);
  if (!caregivers?.length) {
    return jsonResponse({ matches: [] });
  }

  const profileIds = caregivers.map((c) => c.profile_id);
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", profileIds);
  const profileMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("reviewee_id, rating")
    .in("reviewee_id", profileIds);
  const ratingByReviewee: Record<string, number[]> = {};
  (reviewRows ?? []).forEach((r) => {
    const rev = r as { reviewee_id: string; rating: number };
    if (!ratingByReviewee[rev.reviewee_id]) ratingByReviewee[rev.reviewee_id] = [];
    ratingByReviewee[rev.reviewee_id].push(rev.rating);
  });
  const avgByCaregiver: Record<string, number> = {};
  Object.entries(ratingByReviewee).forEach(([id, arr]) => {
    avgByCaregiver[id] = arr.reduce((a, b) => a + b, 0) / arr.length;
  });

  const j = job as Record<string, unknown>;
  const jobForScoring: JobForScoring = {
    id: job.id,
    city: job.city,
    region: job.region,
    country: job.country,
    care_type: job.care_type,
    care_context: (j.care_context as string | null) ?? null,
    financiering_regeling: (j.financiering_regeling as string[] | null) ?? null,
    soort_hulp_zorg: (j.soort_hulp_zorg as string[] | null) ?? null,
    zorgniveau: (j.zorgniveau as string[] | null) ?? null,
    type_inzet: (j.type_inzet as string[] | null) ?? null,
    vaardigheden_ervaring: (j.vaardigheden_ervaring as string[] | null) ?? null,
    role_sought: (j.role_sought as string | null) ?? null,
    experience_requirements: (j.experience_requirements as string | null) ?? null,
    certificates_requirements: (j.certificates_requirements as string | null) ?? null,
    schedule: (j.schedule as string | null) ?? null,
    availability: job.availability,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
    hourly_rate: job.hourly_rate,
  };

  const { data: lastAppRows } = await supabase
    .from("job_applications")
    .select("applicant_id, created_at")
    .in("applicant_id", profileIds)
    .order("created_at", { ascending: false });
  const lastActivityByApplicant: Record<string, string> = {};
  (lastAppRows ?? []).forEach((r) => {
    const row = r as { applicant_id: string; created_at: string };
    if (!lastActivityByApplicant[row.applicant_id]) lastActivityByApplicant[row.applicant_id] = row.created_at;
  });

  const matches = caregivers.map((c) => {
    const caregiver: CaregiverForScoring = {
      id: c.id,
      profile_id: c.profile_id,
      headline: c.headline,
      skills: c.skills ?? [],
      experience_years: c.experience_years,
      availability: c.availability,
      city: c.city,
      region: c.region,
      country: c.country,
      hourly_rate: c.hourly_rate,
      certifications: (c as { certifications?: string | null }).certifications ?? null,
      updated_at: (c as { updated_at?: string }).updated_at ?? null,
      last_activity_at: c.profile_id ? lastActivityByApplicant[c.profile_id] ?? null : null,
    };
    const rating = c.profile_id ? avgByCaregiver[c.profile_id] ?? null : null;
    const result = scoreCaregiverForJob(caregiver, jobForScoring, rating);
    return {
      caregiver: {
        /** Public `/zorenta/caregivers/[id]` segment: prefer linked `profiles.id` over marketplace listing id. */
        id: c.profile_id,
        profile_id: c.profile_id,
        caregiver_profile_id: c.id,
        headline: c.headline,
        display_name: profileMap[c.profile_id]?.display_name ?? null,
        avatar_url: profileMap[c.profile_id]?.avatar_url ?? null,
      },
      score: result.score,
      reasons: result.reasons,
      summary: result.summary,
      narrativeSummary: result.narrativeSummary,
    };
  });

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 10);
  return jsonResponse({ matches: top });
}
