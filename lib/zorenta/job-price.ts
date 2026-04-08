export type JobPriceInput = {
  hourly_rate?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmt(n: number): string {
  // Always display clean euro amounts in UI (no awkward cents like 40.03).
  return String(Math.round(n));
}

/**
 * Single source of truth for vacature prijsweergave.
 * Priority:
 * 1) hourly_rate => €X/uur
 * 2) budget_min + budget_max => €X–€Y
 * 3) budget_min only => vanaf €X
 * 4) budget_max only => tot €Y
 */
export function formatJobPrice(input: JobPriceInput): string | null {
  const hourly = asNumber(input.hourly_rate);
  const min = asNumber(input.budget_min);
  const max = asNumber(input.budget_max);

  if (hourly != null) return `€${fmt(hourly)}/uur`;
  if (min != null && max != null) return `€${fmt(min)}–€${fmt(max)}`;
  if (min != null) return `vanaf €${fmt(min)}`;
  if (max != null) return `tot €${fmt(max)}`;
  return null;
}
