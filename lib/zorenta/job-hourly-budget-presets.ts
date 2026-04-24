import type { CaregiverProfile } from "@/lib/zorenta/caregiver-profile-ui";

/** Shared €/uur presets for zorgvraag intake and handmatige opdracht (jobs/new). */
export const BUDGET_TARIEF_PRESETS: { id: string; label: string; min: number; max: number | null }[] = [
  { id: "20-30", label: "€20–€30", min: 20, max: 30 },
  { id: "30-40", label: "€30–€40", min: 30, max: 40 },
  { id: "40-60", label: "€40–€60", min: 40, max: 60 },
  { id: "60-plus", label: "€60+", min: 60, max: null },
];

export function budgetMatchesPreset(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined,
  p: (typeof BUDGET_TARIEF_PRESETS)[number]
): boolean {
  if (budgetMin !== p.min) return false;
  if (p.max === null) return budgetMax == null;
  return budgetMax === p.max;
}

export function activeBudgetPresetIdFromMinMax(
  budgetMin: number | null | undefined,
  budgetMax: number | null | undefined
): string | null {
  const min = typeof budgetMin === "number" ? budgetMin : null;
  const max = typeof budgetMax === "number" ? budgetMax : null;
  for (const p of BUDGET_TARIEF_PRESETS) {
    if (budgetMatchesPreset(min, max, p)) return p.id;
  }
  return null;
}

/** Map DB experience_years → UI band used by matches filters (optional). */
export function experienceRangeFromYears(
  y: number | null | undefined
): CaregiverProfile["experienceRange"] | undefined {
  if (y == null || Number.isNaN(y)) return undefined;
  if (y <= 1) return "Starter (0–1 jaar)";
  if (y <= 3) return "Ervaren (1–3 jaar)";
  if (y <= 5) return "Senior (3–5 jaar)";
  return "Specialist (5+ jaar)";
}
