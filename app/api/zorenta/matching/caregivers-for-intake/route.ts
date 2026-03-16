import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { scoreCaregiverForIntake, type CaregiverForScoring, type IntakeForScoring } from "@/lib/zorenta/matching";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "client" && profile.role !== "organization") {
    return jsonResponse({ error: "Alleen voor cliënten." }, 403);
  }
  const intakeId = req.nextUrl.searchParams.get("intake_id");
  if (!intakeId) return jsonResponse({ error: "intake_id verplicht." }, 400);

  const { data: intake, error: intakeErr } = await supabase
    .from("care_intakes")
    .select("*")
    .eq("id", intakeId)
    .eq("user_id", userId)
    .single();
  if (intakeErr || !intake) {
    return jsonResponse({ error: "Intake niet gevonden." }, 404);
  }

  const { data: caregivers } = await supabase
    .from("caregiver_profiles")
    .select("id, profile_id, headline, skills, experience_years, availability, city, region, country, hourly_rate")
    .limit(100);
  if (!caregivers?.length) {
    return jsonResponse({ matches: [], intake });
  }

  const profileIds = caregivers.map((c) => c.profile_id);
  const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", profileIds);
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

  const intakeForScoring: IntakeForScoring = {
    care_type: intake.care_type,
    preferred_city: intake.preferred_city,
    preferred_region: intake.preferred_region,
    preferred_country: intake.preferred_country,
    preferred_schedule: intake.preferred_schedule,
    care_frequency: intake.care_frequency,
    skills_required: intake.skills_required ?? [],
    budget_min: intake.budget_min,
    budget_max: intake.budget_max,
    language_preference: intake.language_preference,
    urgency: intake.urgency,
  };

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
    };
    const rating = c.profile_id ? avgByCaregiver[c.profile_id] ?? null : null;
    const result = scoreCaregiverForIntake(caregiver, intakeForScoring, rating);
    return {
      caregiver: {
        id: c.id,
        profile_id: c.profile_id,
        headline: c.headline,
        city: c.city,
        hourly_rate: c.hourly_rate,
        experience_years: c.experience_years,
        display_name: profileMap[c.profile_id]?.display_name ?? null,
      },
      score: result.score,
      reasons: result.reasons,
      summary: result.summary,
      narrativeSummary: result.narrativeSummary,
    };
  });

  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 10);
  return jsonResponse({ matches: top, intake });
}
