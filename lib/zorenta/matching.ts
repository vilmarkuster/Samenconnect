/**
 * Job–caregiver matching: weighted score out of 100, explainable reasons.
 * Weights: shared taxonomy 30, rol 25, locatie 12, inzet 13, budget 10, ervaring 5, cert/extra 5.
 * Taxonomy uses stable value ids → Dutch labels, compared to caregiver skills/headline/certifications.
 */
import type { TaxonomyOption } from "@/lib/zorenta/intake-taxonomy";
import {
  FINANCIERING_REGELING_OPTIONS,
  SOORT_HULP_ZORG_OPTIONS,
  TYPE_INZET_OPTIONS,
  VAARDIGHEDEN_ERVARING_OPTIONS,
  ZORGNIVEAU_OPTIONS,
  labelForValue,
  primaryCareLabelFromTaxonomy,
} from "@/lib/zorenta/intake-taxonomy";

function norm(s: string | null | undefined): string {
  if (s == null || typeof s !== "string") return "";
  return s.trim().toLowerCase();
}

function normList(arr: string[] | null | undefined): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => norm(String(s))).filter(Boolean);
}

function strMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/** Meaningful tokens (skip very short words) */
function tokens(s: string): string[] {
  return norm(s)
    .split(/[\s,/;]+/)
    .map((t) => t.replace(/[^a-z0-9äöüëïéèêà-]/gi, ""))
    .filter((t) => t.length > 2);
}

/**
 * How well `needle` (job field) appears in caregiver skills + headline + optional blob.
 */
function semanticOverlap(
  needle: string | null | undefined,
  skills: string[],
  headline: string,
  extraBlob?: string
): "strong" | "weak" | "none" {
  const n = norm(needle);
  if (!n) return "none";
  const blob = [headline, extraBlob ?? "", ...skills].join(" ");
  if (!blob.trim()) return "none";
  const skillHit = skills.some((s) => s.includes(n) || n.includes(s));
  if (skillHit || blob.includes(n)) return "strong";
  const ntoks = tokens(needle ?? "");
  const hits = ntoks.filter((t) => blob.includes(t));
  if (hits.length >= 2 || (hits.length === 1 && ntoks.length === 1)) return "weak";
  if (hits.length === 1) return "weak";
  return "none";
}

/** Job shape used for scoring. */
export type JobForScoring = {
  id: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  /** Legacy; often mirrored with care_context */
  care_type?: string | null;
  care_context?: string | null;
  /** Shared intake taxonomy (stable value strings) */
  financiering_regeling?: string[] | null;
  soort_hulp_zorg?: string[] | null;
  zorgniveau?: string[] | null;
  type_inzet?: string[] | null;
  vaardigheden_ervaring?: string[] | null;
  role_sought?: string | null;
  experience_requirements?: string | null;
  certificates_requirements?: string | null;
  availability?: string | null;
  schedule?: string | null;
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
  certifications?: string | null;
  updated_at?: string | null;
  last_activity_at?: string | null;
};

export type MatchResult = {
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

const MAX = 100;
/** Weight buckets (sum = 100) */
const W = {
  taxonomy: 30,
  rol: 25,
  locatie: 12,
  inzet: 13,
  budget: 10,
  ervaring: 5,
  certExtra: 5,
};

/** Sub-weights inside taxonomy bucket */
const WT = {
  soort: 10,
  zorgniveau: 5,
  vaardigheden: 10,
  financiering: 2.5,
  typeInzet: 2.5,
};

function overlapToFraction(o: "strong" | "weak" | "none"): number {
  if (o === "strong") return 1;
  if (o === "weak") return 0.56;
  return 0.18;
}

function scoreTaxonomyValues(
  vals: string[] | null | undefined,
  options: TaxonomyOption[],
  caregiver: CaregiverForScoring,
  weight: number
): { pts: number; best: "strong" | "weak" | "none" } {
  if (!vals?.length) return { pts: 0, best: "none" };
  const skills = normList(caregiver.skills);
  const headline = norm(caregiver.headline);
  const certBlob = norm(caregiver.certifications);
  let sum = 0;
  let best: "strong" | "weak" | "none" = "none";
  for (const v of vals) {
    const label = labelForValue(options, v) ?? v;
    const o = semanticOverlap(label, skills, headline, certBlob);
    sum += overlapToFraction(o);
    if (o === "strong") best = "strong";
    else if (o === "weak" && best === "none") best = "weak";
  }
  const avg = sum / vals.length;
  return { pts: Math.round(weight * avg), best };
}

function scoreLegacyZorgContext(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const ctx = norm(job.care_context || job.care_type);
  if (!ctx) return { pts: 0 };
  const skills = normList(caregiver.skills);
  const headline = norm(caregiver.headline);
  const o = semanticOverlap(ctx, skills, headline);
  if (o === "strong") return { pts: W.taxonomy, reason: "Type zorg match" };
  if (o === "weak") return { pts: Math.round(W.taxonomy * 0.56), reason: "Zorgcontext sluit aan" };
  return { pts: Math.round(W.taxonomy * 0.2) };
}

function scoreSharedTaxonomy(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reasons: string[] } {
  const hasStructured =
    (job.soort_hulp_zorg?.length ?? 0) +
      (job.zorgniveau?.length ?? 0) +
      (job.financiering_regeling?.length ?? 0) +
      (job.type_inzet?.length ?? 0) +
      (job.vaardigheden_ervaring?.length ?? 0) >
    0;
  if (!hasStructured) {
    const leg = scoreLegacyZorgContext(job, caregiver);
    return { pts: leg.pts, reasons: leg.reason ? [leg.reason] : [] };
  }
  const s1 = scoreTaxonomyValues(job.soort_hulp_zorg, SOORT_HULP_ZORG_OPTIONS, caregiver, WT.soort);
  const s2 = scoreTaxonomyValues(job.zorgniveau, ZORGNIVEAU_OPTIONS, caregiver, WT.zorgniveau);
  const s3 = scoreTaxonomyValues(job.vaardigheden_ervaring, VAARDIGHEDEN_ERVARING_OPTIONS, caregiver, WT.vaardigheden);
  const s4 = scoreTaxonomyValues(job.financiering_regeling, FINANCIERING_REGELING_OPTIONS, caregiver, WT.financiering);
  const s5 = scoreTaxonomyValues(job.type_inzet, TYPE_INZET_OPTIONS, caregiver, WT.typeInzet);
  let pts = s1.pts + s2.pts + s3.pts + s4.pts + s5.pts;
  pts = Math.min(W.taxonomy, pts);
  const reasons: string[] = [];
  if (s1.best === "strong" || s1.pts >= Math.round(WT.soort * 0.65)) reasons.push("Soort zorg sluit aan");
  if (s2.best === "strong" || s2.pts >= Math.round(WT.zorgniveau * 0.65)) reasons.push("Zorgniveau sluit aan");
  if (s3.best === "strong" || s3.pts >= Math.round(WT.vaardigheden * 0.65)) reasons.push("Vaardigheden matchen");
  if (s4.best === "strong" || s4.pts >= 2) reasons.push("Financiering / regeling sluit aan");
  if (s5.best === "strong" || s5.pts >= 2) reasons.push("Type inzet sluit aan");
  return { pts, reasons };
}

function scoreRol(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const role = norm(job.role_sought);
  if (!role) return { pts: 0 };
  const skills = normList(caregiver.skills);
  const headline = norm(caregiver.headline);
  const o = semanticOverlap(role, skills, headline);
  if (o === "strong") return { pts: W.rol, reason: "Rol match" };
  if (o === "weak") return { pts: Math.round(W.rol * 0.56), reason: "Rol sluit aan" };
  return { pts: Math.round(W.rol * 0.2) };
}

function scoreLocatie(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reasons: string[] } {
  const reasons: string[] = [];
  let pts = 0;
  const cityW = 8;
  const regionW = 4;
  if (strMatch(job.city, caregiver.city)) {
    pts += cityW;
    reasons.push("Plaats past");
  }
  if (strMatch(job.region, caregiver.region)) {
    pts += regionW;
    reasons.push("Regio past");
  }
  return { pts: Math.min(W.locatie, pts), reasons };
}

function scoreInzet(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const jobBlob = [norm(job.availability), norm(job.schedule)].filter(Boolean).join(" ");
  const cg = norm(caregiver.availability);
  if (!jobBlob || !cg) {
    if (jobBlob && !cg) return { pts: Math.round(W.inzet * 0.15) };
    return { pts: 0 };
  }
  if (strMatch(job.availability, caregiver.availability)) {
    return { pts: W.inzet, reason: "Inzetvorm past" };
  }
  const jt = tokens(job.availability ?? "");
  const ct = tokens(caregiver.availability ?? "");
  const overlap = jt.some((t) => ct.includes(t) || cg.includes(t));
  if (overlap) return { pts: Math.round(W.inzet * 0.67), reason: "Planning sluit aan" };
  const scheduleHint = norm(job.schedule);
  if (scheduleHint && (cg.includes(scheduleHint) || scheduleHint.split(/\s+/).some((w) => w.length > 2 && cg.includes(w)))) {
    return { pts: Math.round(W.inzet * 0.45), reason: "Planning sluit aan" };
  }
  return { pts: Math.round(W.inzet * 0.2) };
}

function scoreBudget(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const jobMin = job.budget_min ?? job.hourly_rate ?? 0;
  const jobMax = job.budget_max ?? job.hourly_rate ?? 0;
  const caregiverRate = caregiver.hourly_rate ?? 0;
  if (caregiverRate > 0 && (jobMin > 0 || jobMax > 0)) {
    const inRange =
      (jobMin > 0 && jobMax > 0 && caregiverRate >= jobMin && caregiverRate <= jobMax) ||
      (jobMin > 0 && jobMax === 0 && caregiverRate >= jobMin) ||
      (jobMax > 0 && jobMin === 0 && caregiverRate <= jobMax);
    if (inRange) return { pts: W.budget, reason: "Tarief past bij budget" };
    return { pts: Math.round(W.budget * 0.3), reason: "Tarief in de buurt" };
  }
  if (caregiverRate > 0 || jobMin > 0 || jobMax > 0) {
    return { pts: Math.round(W.budget * 0.2) };
  }
  return { pts: 0 };
}

function scoreErvaring(caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const exp = caregiver.experience_years ?? 0;
  if (exp >= 5) return { pts: W.ervaring, reason: "Ervaring sluit aan" };
  if (exp >= 2) return { pts: Math.round(W.ervaring * 0.6), reason: "Ervaring sluit aan" };
  if (exp >= 1) return { pts: Math.round(W.ervaring * 0.35), reason: "Enige ervaring" };
  return { pts: 0 };
}

function scoreCertExtra(job: JobForScoring, caregiver: CaregiverForScoring): { pts: number; reason?: string } {
  const expReq = norm(job.experience_requirements);
  const certReq = norm(job.certificates_requirements);
  if (!expReq && !certReq) return { pts: Math.round(W.certExtra * 0.2) };
  const skills = normList(caregiver.skills);
  const headline = norm(caregiver.headline);
  const certBlob = norm(caregiver.certifications);
  const blob = [...skills, headline, certBlob].join(" ");
  if (!blob) return { pts: 0 };
  let pts = 0;
  if (expReq && semanticOverlap(expReq, skills, headline) !== "none") {
    pts += Math.round(W.certExtra * 0.55);
  }
  if (certReq) {
    const strong = certBlob && (certBlob.includes(certReq) || certReq.split(/\s+/).filter((w) => w.length > 3).some((w) => certBlob.includes(w)));
    const weak = tokens(certReq).some((t) => t.length > 2 && blob.includes(t));
    if (strong || weak) pts += Math.round(W.certExtra * 0.45);
  }
  const finalPts = Math.min(W.certExtra, pts || Math.round(W.certExtra * 0.12));
  return {
    pts: finalPts,
    reason: finalPts >= 3 ? "Certificaten / eisen matchen" : undefined,
  };
}

/**
 * Score how well a job matches a caregiver (caregiver view: jobs for me).
 */
export function scoreJobForCaregiver(
  job: JobForScoring,
  caregiver: CaregiverForScoring,
  _caregiverRating: number | null
): MatchResult {
  const reasons: string[] = [];

  const tax = scoreSharedTaxonomy(job, caregiver);
  const r = scoreRol(job, caregiver);
  const l = scoreLocatie(job, caregiver);
  const inv = scoreInzet(job, caregiver);
  const b = scoreBudget(job, caregiver);
  const e = scoreErvaring(caregiver);
  const c = scoreCertExtra(job, caregiver);

  let score = tax.pts + r.pts + l.pts + inv.pts + b.pts + e.pts + c.pts;
  score = Math.min(MAX, Math.round(score));

  tax.reasons.forEach((x) => reasons.push(x));
  if (r.reason) reasons.push(r.reason);
  l.reasons.forEach((x) => reasons.push(x));
  if (inv.reason) reasons.push(inv.reason);
  if (b.reason) reasons.push(b.reason);
  if (e.reason) reasons.push(e.reason);
  if (c.reason) reasons.push(c.reason);

  const dedup = [...new Set(reasons)].slice(0, 8);
  const summary = dedup.length ? dedup.slice(0, 5).join(" · ") : "Algemene match";

  const taxLabel = primaryCareLabelFromTaxonomy(job.soort_hulp_zorg ?? undefined, job.zorgniveau ?? undefined);
  const careLabel = taxLabel || (job.care_context || job.care_type)?.trim() || "";
  const city = job.city?.trim() || "";
  let narrativeSummary: string | undefined;
  if (score >= 50 && (careLabel || city)) {
    const parts: string[] = [];
    if (careLabel) parts.push(careLabel);
    if (city) parts.push(`in ${city}`);
    narrativeSummary = parts.length ? `Sterke match voor ${parts.join(" ")}` : undefined;
  }

  return { score, reasons: dedup, summary, narrativeSummary };
}

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
  financiering_regeling?: string[] | null;
  soort_hulp_zorg?: string[] | null;
  zorgniveau?: string[] | null;
  type_inzet?: string[] | null;
  vaardigheden_ervaring?: string[] | null;
  budget_min?: number | null;
  budget_max?: number | null;
  language_preference?: string | null;
  urgency?: string | null;
};

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
    care_context: intake.care_type ?? undefined,
    care_type: intake.care_type ?? undefined,
    financiering_regeling: intake.financiering_regeling,
    soort_hulp_zorg: intake.soort_hulp_zorg,
    zorgniveau: intake.zorgniveau,
    type_inzet: intake.type_inzet,
    vaardigheden_ervaring: intake.vaardigheden_ervaring,
    availability: intake.preferred_schedule ?? intake.care_frequency ?? undefined,
    budget_min: intake.budget_min ?? undefined,
    budget_max: intake.budget_max ?? undefined,
  };
  const result = scoreJobForCaregiver(jobLike, caregiver, caregiverRating);
  const lang = norm(intake.language_preference);
  const headline = norm(caregiver.headline);
  if (lang && headline && headline.includes(lang)) {
    result.reasons.push("Taal match");
    result.score = Math.min(MAX, result.score + 2);
  }
  result.summary = result.reasons.slice(0, 5).join(" · ");
  const taxLabel = primaryCareLabelFromTaxonomy(intake.soort_hulp_zorg ?? undefined, intake.zorgniveau ?? undefined);
  const careLine = taxLabel || intake.care_type?.trim();
  if (result.score >= 50 && careLine) {
    result.narrativeSummary = `Sterke match voor ${careLine}${intake.preferred_city ? ` in ${intake.preferred_city}` : ""}`;
  }
  return result;
}
