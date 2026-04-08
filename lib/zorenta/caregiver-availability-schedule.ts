export const AVAILABILITY_DAY_KEYS = ["ma", "di", "wo", "do", "vr", "za", "zo"] as const;
export type AvailabilityDayKey = (typeof AVAILABILITY_DAY_KEYS)[number];

export const AVAILABILITY_TIME_SLOTS = ["ochtend", "middag", "avond", "nacht"] as const;
export type AvailabilityTimeSlot = (typeof AVAILABILITY_TIME_SLOTS)[number];

/** Per day: selected tijden; empty array = not available that day. */
export type AvailabilitySchedule = Record<AvailabilityDayKey, AvailabilityTimeSlot[]>;

const DAY_SET = new Set<string>(AVAILABILITY_DAY_KEYS);
const SLOT_SET = new Set<string>(AVAILABILITY_TIME_SLOTS);

export function emptyAvailabilitySchedule(): AvailabilitySchedule {
  return {
    ma: [],
    di: [],
    wo: [],
    do: [],
    vr: [],
    za: [],
    zo: [],
  };
}

function sortSlots(a: AvailabilityTimeSlot, b: AvailabilityTimeSlot): number {
  return AVAILABILITY_TIME_SLOTS.indexOf(a) - AVAILABILITY_TIME_SLOTS.indexOf(b);
}

/** Normalize schedule from API/DB (unknown). Falls back to empty. */
export function normalizeAvailabilitySchedule(raw: unknown): AvailabilitySchedule {
  const base = emptyAvailabilitySchedule();
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  for (const day of AVAILABILITY_DAY_KEYS) {
    const v = o[day];
    if (!Array.isArray(v)) {
      base[day] = [];
      continue;
    }
    const slots = v
      .map((x) => String(x ?? "").trim().toLowerCase())
      .filter((x): x is AvailabilityTimeSlot => SLOT_SET.has(x));
    base[day] = [...new Set(slots)].sort(sortSlots);
  }
  return base;
}

/** True if at least one day has ≥1 time slot. */
export function availabilityScheduleHasSlots(schedule: AvailabilitySchedule): boolean {
  return AVAILABILITY_DAY_KEYS.some((d) => schedule[d].length > 0);
}

/**
 * Legacy: global day list + global time list → each selected day gets the same tijden
 * (matches previous UI semantics).
 */
export function scheduleFromLegacyArrays(
  days: string[] | null | undefined,
  times: string[] | null | undefined
): AvailabilitySchedule {
  const s = emptyAvailabilitySchedule();
  const d = (days ?? []).map((x) => String(x).trim().toLowerCase()).filter((x) => DAY_SET.has(x)) as AvailabilityDayKey[];
  const t = (times ?? [])
    .map((x) => String(x).trim().toLowerCase())
    .filter((x): x is AvailabilityTimeSlot => SLOT_SET.has(x));
  const perDay = t.length ? [...new Set(t)].sort(sortSlots) : [];
  for (const day of d) {
    s[day] = [...perDay];
  }
  return s;
}

/** Derive legacy columns for backward compatibility (matching, older UI). */
export function deriveLegacyAvailabilityFromSchedule(schedule: AvailabilitySchedule): {
  availability_days: string[];
  availability_times: string[];
} {
  const dayList: string[] = [];
  const timeSet = new Set<string>();
  for (const day of AVAILABILITY_DAY_KEYS) {
    const slots = schedule[day];
    if (slots.length > 0) {
      dayList.push(day);
      for (const t of slots) timeSet.add(t);
    }
  }
  const availability_times = [...timeSet].sort(
    (a, b) =>
      AVAILABILITY_TIME_SLOTS.indexOf(a as AvailabilityTimeSlot) -
      AVAILABILITY_TIME_SLOTS.indexOf(b as AvailabilityTimeSlot)
  );
  return { availability_days: dayList, availability_times };
}

export const AVAILABILITY_DAY_LABELS: Record<AvailabilityDayKey, string> = {
  ma: "Ma",
  di: "Di",
  wo: "Wo",
  do: "Do",
  vr: "Vr",
  za: "Za",
  zo: "Zo",
};

export const AVAILABILITY_TIME_LABELS: Record<AvailabilityTimeSlot, string> = {
  ochtend: "Ochtend",
  middag: "Middag",
  avond: "Avond",
  nacht: "Nacht",
};
