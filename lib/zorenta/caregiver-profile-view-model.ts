import {
  availabilityScheduleHasSlots,
  normalizeAvailabilitySchedule,
  type AvailabilitySchedule,
} from "@/lib/zorenta/caregiver-availability-schedule";
import { parseStringListFromMixed } from "@/lib/zorenta/profile-display";

/** Loose shape from API / DB (own or public). */
export type CaregiverProfileFields = {
  bio?: string | null;
  skills?: unknown;
  care_types?: unknown;
  experience_years?: number | null;
  availability?: string | null;
  availability_days?: unknown;
  availability_times?: unknown;
  availability_schedule?: unknown;
  certifications?: unknown;
  languages?: unknown;
  hourly_rate?: number | null;
  min_rate?: number | null;
  travel_distance_km?: number | null;
  has_driver_license?: boolean | null;
};

export type CaregiverViewModel = {
  skillTags: string[];
  typeTags: string[];
  scheduleNorm: AvailabilitySchedule | null;
  hasScheduleSlots: boolean;
  availabilityText: string;
  availDays: string[];
  availTimes: string[];
  certs: string[];
  langs: string[];
  hasBeschikbaarheid: boolean;
  hasTarief: boolean;
  hasMobiliteit: boolean;
  hasVaardigheden: boolean;
  hasErvaring: boolean;
  hasCertificaten: boolean;
  hasTalen: boolean;
  hasOverMij: boolean;
  experienceYears: number | null;
  hourlyRate: number | null;
  minRate: number | null;
  travelKm: number | null | undefined;
  hasLicense: boolean;
};

/** Same experience line as /profile (n+ jaar …). */
export function formatCaregiverExperienceLine(years: number | null | undefined): string | null {
  if (years == null || !Number.isFinite(years) || years <= 0) return null;
  const n = Math.floor(years);
  if (n <= 0) return null;
  return `${n}+ jaar werkervaring in de zorg`;
}

export function buildCaregiverViewModel(c: CaregiverProfileFields | null | undefined): CaregiverViewModel {
  const skillTags = parseStringListFromMixed(c?.skills);
  const typeTags = parseStringListFromMixed(c?.care_types);
  const availabilityText = typeof c?.availability === "string" ? c.availability.trim() : "";
  const availDays = parseStringListFromMixed(c?.availability_days);
  const availTimes = parseStringListFromMixed(c?.availability_times);
  const scheduleNorm = c?.availability_schedule != null ? normalizeAvailabilitySchedule(c.availability_schedule) : null;
  const hasScheduleSlots = scheduleNorm != null && availabilityScheduleHasSlots(scheduleNorm);
  const hasBeschikbaarheid =
    Boolean(availabilityText) ||
    hasScheduleSlots ||
    (!hasScheduleSlots && (availDays.length > 0 || availTimes.length > 0));

  const hourlyRaw = c?.hourly_rate;
  const minRaw = c?.min_rate;
  const hourlyRate =
    typeof hourlyRaw === "number" && Number.isFinite(hourlyRaw) && hourlyRaw > 0 ? hourlyRaw : null;
  const minRate = typeof minRaw === "number" && Number.isFinite(minRaw) && minRaw > 0 ? minRaw : null;
  const hasTarief = hourlyRate != null || minRate != null;

  const travelRaw = c?.travel_distance_km;
  const travelKm =
    travelRaw != null && typeof travelRaw === "number" && Number.isFinite(travelRaw) ? travelRaw : undefined;
  const hasLicense = c?.has_driver_license === true;
  const hasMobiliteit =
    (travelKm != null && travelKm >= 0) || hasLicense;

  const certs = parseStringListFromMixed(c?.certifications ?? null);
  const langs = parseStringListFromMixed(c?.languages ?? null);

  const exp = c?.experience_years;
  const experienceYears =
    typeof exp === "number" && Number.isFinite(exp) && exp > 0 ? exp : null;
  const hasErvaring = experienceYears != null;

  return {
    skillTags,
    typeTags,
    scheduleNorm,
    hasScheduleSlots,
    availabilityText,
    availDays,
    availTimes,
    certs,
    langs,
    hasBeschikbaarheid,
    hasTarief,
    hasMobiliteit,
    hasVaardigheden: skillTags.length > 0 || typeTags.length > 0,
    hasErvaring,
    hasCertificaten: certs.length > 0,
    hasTalen: langs.length > 0,
    hasOverMij: Boolean(typeof c?.bio === "string" && c.bio.trim()),
    experienceYears,
    hourlyRate,
    minRate,
    travelKm,
    hasLicense,
  };
}
