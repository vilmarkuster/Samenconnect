/**
 * Single mapping from caregiver_profiles (DB row or JSON) → display shape used by
 * /api/zorenta/caregivers/[id] (pageCaregiver), /api/zorenta/me (caregiver), and UI view models.
 */

import {
  normalizeAvailabilitySchedule,
  type AvailabilitySchedule,
} from "@/lib/zorenta/caregiver-availability-schedule";
import { parseStringListFromMixed } from "@/lib/zorenta/profile-display";

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v != null && v !== "" && typeof v !== "boolean") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type NormalizedCaregiverProfileForDisplay = {
  headline: string | null;
  bio: string | null;
  skills: string[];
  care_types: string[];
  city: string | null;
  region: string | null;
  country: string | null;
  experience_years: number | null;
  availability: string | null;
  availability_days: string[];
  availability_times: string[];
  availability_schedule: AvailabilitySchedule | null;
  certifications: string[];
  languages: string[];
  hourly_rate: number | null;
  min_rate: number | null;
  travel_distance_km: number | null;
  has_driver_license: boolean | null;
  /** Alleen bij eigen account (/me); nooit op publieke caregiver-GET. */
  phone?: string | null;
};

/**
 * `caregiver` in marketplace-GET is een card-object met o.a. `tags` + `linkedProfileId`.
 * Dat mag niet als volledige caregiver-profielpayload gebruikt worden.
 */
export function isMarketplaceCardCaregiverPayload(c: unknown): boolean {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return "tags" in o && Array.isArray(o.tags);
}

/**
 * True alleen voor echte `normalizeCaregiverProfileRow`-output (caregiver_profiles).
 * Geen marketplace-kaart (`tags`, `name`+`rate`, …) en geen lookalike zonder volledige shape.
 */
export function isNormalizedCaregiverProfilePayload(o: unknown): o is NormalizedCaregiverProfileForDisplay {
  if (!o || typeof o !== "object") return false;
  const x = o as Record<string, unknown>;
  if ("tags" in x && Array.isArray(x.tags)) return false;
  if (typeof x.name === "string" && "rate" in x) return false;
  if ("rate" in x && !("hourly_rate" in x)) return false;
  if (!Array.isArray(x.skills) || !Array.isArray(x.care_types)) return false;
  if (!Array.isArray(x.availability_days) || !Array.isArray(x.availability_times)) return false;
  if (!Array.isArray(x.certifications) || !Array.isArray(x.languages)) return false;
  return true;
}

/**
 * Publieke profielpagina: alleen linked caregiver_profiles-body (zelfde bron als /api/zorenta/me).
 * Nooit `source=marketplace-only` of marketplace-kaart als profielbody.
 */
export function resolveCaregiverPagePayload(api: Record<string, unknown>): NormalizedCaregiverProfileForDisplay | null {
  if (api.source === "marketplace-only") return null;

  const pick = (raw: unknown): NormalizedCaregiverProfileForDisplay | null => {
    if (raw && typeof raw === "object" && isNormalizedCaregiverProfilePayload(raw)) return raw;
    return null;
  };

  return pick(api.caregiver) ?? pick(api.pageCaregiver);
}

export function normalizeCaregiverProfileRow(
  cg: Record<string, unknown> | null | undefined,
  options?: { includePrivateContact?: boolean }
): NormalizedCaregiverProfileForDisplay | null {
  if (!cg || typeof cg !== "object") return null;

  const hourlyRaw = cg.hourly_rate;
  const hourly =
    typeof hourlyRaw === "number" && Number.isFinite(hourlyRaw)
      ? hourlyRaw
      : hourlyRaw != null && hourlyRaw !== ""
        ? Number(hourlyRaw)
        : null;

  const expRaw = cg.experience_years;
  const expYears =
    typeof expRaw === "number" && Number.isFinite(expRaw)
      ? expRaw
      : expRaw != null && expRaw !== ""
        ? Number(expRaw)
        : null;

  const minRaw = numOrNull(cg.min_rate);
  const travelRaw = numOrNull(cg.travel_distance_km);
  const scheduleRaw = cg.availability_schedule != null ? normalizeAvailabilitySchedule(cg.availability_schedule) : null;

  const base: NormalizedCaregiverProfileForDisplay = {
    headline: cg.headline != null ? String(cg.headline) : null,
    bio: cg.bio != null ? String(cg.bio) : null,
    skills: parseStringListFromMixed(cg.skills),
    care_types: parseStringListFromMixed(cg.care_types),
    city: cg.city != null ? String(cg.city) : null,
    region: cg.region != null ? String(cg.region) : null,
    country: cg.country != null ? String(cg.country) : null,
    experience_years: expYears != null && Number.isFinite(expYears) ? expYears : null,
    availability: cg.availability != null ? String(cg.availability) : null,
    availability_days: parseStringListFromMixed(cg.availability_days),
    availability_times: parseStringListFromMixed(cg.availability_times),
    availability_schedule: scheduleRaw,
    certifications: parseStringListFromMixed(cg.certifications),
    languages: parseStringListFromMixed(cg.languages),
    hourly_rate: hourly != null && Number.isFinite(hourly) ? hourly : null,
    min_rate: minRaw != null && Number.isFinite(minRaw) && minRaw > 0 ? minRaw : null,
    travel_distance_km: travelRaw != null && Number.isFinite(travelRaw) && travelRaw >= 0 ? Math.round(travelRaw) : null,
    has_driver_license: typeof cg.has_driver_license === "boolean" ? cg.has_driver_license : null,
  };

  if (options?.includePrivateContact) {
    const ph = cg.phone != null ? String(cg.phone).trim() : "";
    return { ...base, phone: ph || null };
  }

  return base;
}
