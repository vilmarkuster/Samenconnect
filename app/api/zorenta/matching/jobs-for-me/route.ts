import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { scoreJobForCaregiver, type JobForScoring, type CaregiverForScoring } from "@/lib/zorenta/matching";
import { careJobRowsWithExistingPosters } from "@/lib/zorenta/care-jobs-poster-filter";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "caregiver") {
    return jsonResponse({ error: "Alleen voor zorgverleners." }, 403);
  }

  const { data: caregiverRow } = await supabase
    .from("caregiver_profiles")
    .select("*, updated_at")
    .eq("profile_id", userId)
    .single();
  if (!caregiverRow) {
    return jsonResponse({ matches: [], message: "Vul eerst je profiel in." });
  }

  const { data: lastApps } = await supabase
    .from("job_applications")
    .select("created_at")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastActivityAt = (lastApps?.[0] as { created_at?: string } | undefined)?.created_at ?? null;

  const { data: jobsRaw } = await supabase
    .from("care_jobs")
    .select(
      "id, title, description, city, region, country, care_type, care_context, financiering_regeling, soort_hulp_zorg, zorgniveau, type_inzet, vaardigheden_ervaring, role_sought, experience_requirements, certificates_requirements, schedule, availability, budget_min, budget_max, hourly_rate, status, created_at, image_urls, poster_id"
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);
  const jobs = await careJobRowsWithExistingPosters(supabase, jobsRaw ?? []);
  if (!jobs.length) {
    return jsonResponse({ matches: [] });
  }

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("reviewee_id, rating")
    .eq("reviewee_id", userId);
  const ratings = (reviewRows ?? []).map((r) => (r as { rating: number }).rating).filter((n) => n != null);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const caregiver: CaregiverForScoring = {
    id: caregiverRow.id,
    profile_id: caregiverRow.profile_id,
    headline: caregiverRow.headline,
    skills: caregiverRow.skills ?? [],
    experience_years: caregiverRow.experience_years,
    availability: caregiverRow.availability,
    city: caregiverRow.city,
    region: caregiverRow.region,
    country: caregiverRow.country,
    hourly_rate: caregiverRow.hourly_rate,
    certifications: (caregiverRow as { certifications?: string | null }).certifications ?? null,
    updated_at: caregiverRow.updated_at ?? null,
    last_activity_at: lastActivityAt,
  };

  const matches = jobs.map((job) => {
    const result = scoreJobForCaregiver(job as JobForScoring, caregiver, avgRating);
    return {
      job: {
        id: job.id,
        title: job.title,
        city: job.city,
        region: job.region,
        country: job.country,
        care_type: job.care_type,
        availability: job.availability,
        budget_min: job.budget_min,
        budget_max: job.budget_max,
        hourly_rate: job.hourly_rate,
        status: job.status,
        poster_id: (job as { poster_id?: string }).poster_id ?? null,
        image_urls: (job as { image_urls?: string[] | null }).image_urls ?? null,
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
