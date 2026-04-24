/** SamenConnect uurtarief-UX: hele euro’s, stappen van €5, vloer €10. */

export const HOURLY_EURO_MIN = 10;
export const HOURLY_EURO_STEP = 5;

/** Snap naar dichtstbijzijnde veelvoud van €5, minimaal €10. */
export function snapHourlyEuro(n: number): number {
  if (!Number.isFinite(n)) return HOURLY_EURO_MIN;
  const rounded = Math.round(n);
  const stepped = Math.round(rounded / HOURLY_EURO_STEP) * HOURLY_EURO_STEP;
  return Math.max(HOURLY_EURO_MIN, stepped);
}

/** DB / legacy decimalen → geheel → snap (voor hydrate / load). */
export function normalizeHourlyEuroFromDb(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return snapHourlyEuro(Math.round(n));
}

export type HourlyMinMaxValidation =
  | { ok: true; min: number | null; max: number | null }
  | { ok: false; message: string };

/**
 * Optioneel paar: leeg = ok. Als één of beide gezet: gehele euro’s, min €10, max ≥ min.
 */
export function validateHourlyMinMaxPair(
  min: number | null | undefined,
  max: number | null | undefined
): HourlyMinMaxValidation {
  const hasMin = min != null && Number.isFinite(min);
  const hasMax = max != null && Number.isFinite(max);
  if (!hasMin && !hasMax) return { ok: true, min: null, max: null };

  const mi = hasMin ? Math.round(min as number) : null;
  const ma = hasMax ? Math.round(max as number) : null;

  if (mi != null && mi < HOURLY_EURO_MIN) {
    return { ok: false, message: `Minimum is minimaal €${HOURLY_EURO_MIN} per uur.` };
  }
  if (ma != null && ma < HOURLY_EURO_MIN) {
    return { ok: false, message: `Maximum is minimaal €${HOURLY_EURO_MIN} per uur.` };
  }
  if (mi != null && ma != null && mi > ma) {
    return { ok: false, message: "Minimum mag niet hoger zijn dan maximum." };
  }
  return {
    ok: true,
    min: mi != null ? snapHourlyEuro(mi) : null,
    max: ma != null ? snapHourlyEuro(ma) : null,
  };
}

/** String uit formulier → geheel getal of null (geen parseFloat). */
export function parseHourlyEuroInputString(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t.replace(/\D/g, ""), 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}
