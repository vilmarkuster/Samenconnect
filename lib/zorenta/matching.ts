/**
 * MVP matching engine: deterministic scoring for job–caregiver fit.
 * No AI/ML; transparent formula. Score 0–100 + explainable reasons.
 */

function norm(s: string | null | undefined): string {
  if (s == null || typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

function normList(arr: string[] | null | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => norm(String(s))).filter(Boolean);
}

/** Check if two strings match (normalized). */
function strMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** Job shape used for scoring. */
export type JobForScoring = {
  id: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  care_type?: string | null;
  availability?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  hourly_rate?: number | null;
};

/** Caregiver profile shape used for scoring. */
export type CaregiverForScoring = {
  id: string;
  profile_id: string;
  headline?: string | null;
  skills?: string[] | null;
  experience_years?: number | null;
  availability?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  hourly_rate?: number | null;
  /** Profile updated_at (ISO string); recent = bonus. */
  updated_at?: string | null;
  /** Last application or activity (ISO string); recent = bonus. */
  last_activity_at?: string | null;
};

export type MatchResult = {
  score: number;
  reasons: string[];
  summary: string;
  /** Short phrase e.g. "Sterke match voor dementiezorg in Amsterdam" */
  narrativeSummary?: string;
};

const MAX_SCORE = 100;
const WEIGHTS = {
  city: 20,
  region: 10,
  skillOverlap: 20,
  careTypeMatch: 15,
  availability: 10,
  experience: 10,
  rateFit: 10,
  rating: 5,
};

/**
 * Score how well a job matches a caregiver (for caregiver view: "best jobs for me").
 */
export function scoreJobForCaregiver(
  job: JobForScoring,
  caregiver: CaregiverForScoring,
  caregiverRating: number | null
): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  if (strMatch(job.city, caregiver.city)) {
    score += WEIGHTS.city;
    reasons.push("Plaats match");
  }
  if (strMatch(job.region, caregiver.region)) {
    score += WEIGHTS.region;
    reasons.push("Regio match");
  }

  const jobCare = norm(job.care_type);
  const skills = normList(caregiver.skills);
  const headline = norm(caregiver.headline);
  const skillOverlap = jobCare && skills.some((s) => s.includes(jobCare) || jobCare.includes(s));
  if (skillOverlap) {
    score += WEIGHTS.skillOverlap;
    reasons.push("Vaardigheden match");
  }
  const careTypeMatch = jobCare && headline.includes(jobCare);
  if (careTypeMatch) {
    score += WEIGHTS.careTypeMatch;
    reasons.push("Type zorg match");
  }

  if (strMatch(job.availability, caregiver.availability)) {
    score += WEIGHTS.availability;
    reasons.push("Beschikbaarheid match");
  }

  const exp = caregiver.experience_years ?? 0;
  if (exp >= 5) {
    score += WEIGHTS.experience;
    reasons.push("Ervaring 5+ jaar");
  } else if (exp >= 2) {
    score += Math.floor(WEIGHTS.experience * 0.6);
    reasons.push("Enige ervaring");
  } else if (exp >= 1) {
    score += Math.floor(WEIGHTS.experience * 0.3);
    reasons.push("Starter ervaring");
  }

  const jobMin = job.budget_min ?? job.hourly_rate ?? 0;
  const jobMax = job.budget_max ?? job.hourly_rate ?? 0;
  const caregiverRate = caregiver.hourly_rate ?? 0;
  if (caregiverRate > 0 && (jobMin > 0 || jobMax > 0)) {
    const inRange = (jobMin > 0 && jobMax > 0 && caregiverRate >= jobMin && caregiverRate <= jobMax) ||
      (jobMin > 0 && jobMax === 0 && caregiverRate >= jobMin) ||
      (jobMax > 0 && jobMin === 0 && caregiverRate <= jobMax);
    if (inRange) {
      score += WEIGHTS.rateFit;
      reasons.push("Tarief past bij budget");
    } else {
      score += Math.floor(WEIGHTS.rateFit * 0.3);
      reasons.push("Tarief indicatie");
    }
  } else if (caregiverRate > 0 || jobMin > 0 || jobMax > 0) {
    score += Math.floor(WEIGHTS.rateFit * 0.2);
  }

  if (caregiverRating != null && caregiverRating >= 0) {
    const ratingScore = Math.round((caregiverRating / 5) * WEIGHTS.rating);
    score += ratingScore;
    reasons.push(`Beoordeling ${caregiverRating.toFixed(1)} ★`);
  }

  score = Math.min(MAX_SCORE, score);
  const summary = reasons.length
    ? reasons.slice(0, 4).join(" + ")
    : "Algemene match";
  const careType = job.care_type?.trim() || "";
  const city = job.city?.trim() || "";
  let narrativeSummary: string | undefined;
  if (score >= 50 && (careType || city)) {
    const parts: string[] = [];
    if (careType) parts.push(careType);
    if (city) parts.push(`in ${city}`);
    narrativeSummary = parts.length ? `Sterke match voor ${parts.join(" ")}` : undefined;
  }
  return { score, reasons, summary, narrativeSummary };
}

/**
 * Score how well a caregiver matches a job (for client/org view: "best caregivers for this job").
 */
export function scoreCaregiverForJob(
  caregiver: CaregiverForScoring,
  job: JobForScoring,
  caregiverRating: number | null
): MatchResult {
  return scoreJobForCaregiver(job, caregiver, caregiverRating);
}

/** Intake shape used to score caregivers (maps to job-like criteria). */
export type IntakeForScoring = {
  care_type?: string | null;
  preferred_city?: string | null;
  preferred_region?: string | null;
  preferred_country?: string | null;
  preferred_schedule?: string | null;
  care_frequency?: string | null;
  skills_required?: string[] | null;
  budget_min?: number | null;
  budget_max?: number | null;
  language_preference?: string | null;
  urgency?: string | null;
};

/**
 * Score how well a caregiver matches an intake. Uses same weights as job matching.
 * Optionally adds narrative for urgency/type.
 */
export function scoreCaregiverForIntake(
  caregiver: CaregiverForScoring,
  intake: IntakeForScoring,
  caregiverRating: number | null
): MatchResult {
  const jobLike: JobForScoring = {
    id: "",
    city: intake.preferred_city ?? undefined,
    region: intake.preferred_region ?? undefined,
    country: intake.preferred_country ?? undefined,
    care_type: intake.care_type ?? undefined,
    availability: intake.preferred_schedule ?? intake.care_frequency ?? undefined,
    budget_min: intake.budget_min ?? undefined,
    budget_max: intake.budget_max ?? undefined,
  };
  const result = scoreJobForCaregiver(jobLike, caregiver, caregiverRating);
  const skillsRequired = normList(intake.skills_required);
  const caregiverSkills = normList(caregiver.skills);
  const skillMatch = skillsRequired.length > 0 && skillsRequired.some((s) =>
    caregiverSkills.some((cs) => cs.includes(s) || s.includes(cs))
  );
  if (skillMatch && result.reasons.indexOf("Vaardigheden match") === -1) {
    result.reasons.push("Vaardigheden match");
    result.score = Math.min(MAX_SCORE, result.score + WEIGHTS.skillOverlap);
  }
  const lang = norm(intake.language_preference);
  const headline = norm(caregiver.headline);
  if (lang && headline && headline.includes(lang)) {
    result.reasons.push("Taal match");
    result.score = Math.min(MAX_SCORE, result.score + 5);
  }
  result.summary = result.reasons.slice(0, 4).join(" + ");
  if (result.score >= 50 && intake.care_type) {
    result.narrativeSummary = `Sterke match voor ${intake.care_type}${intake.preferred_city ? ` in ${intake.preferred_city}` : ""}`;
  }
  return result;
}
