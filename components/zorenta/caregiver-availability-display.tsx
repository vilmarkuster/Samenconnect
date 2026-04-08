"use client";

import {
  AVAILABILITY_DAY_KEYS,
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_TIME_LABELS,
  normalizeAvailabilitySchedule,
  type AvailabilitySchedule,
} from "@/lib/zorenta/caregiver-availability-schedule";

/** Read-only list: per dag welke tijden (zelfde inhoud op eigen profiel en publieke pagina). */
export function AvailabilityScheduleReadonly({ schedule }: { schedule: AvailabilitySchedule }) {
  const n = normalizeAvailabilitySchedule(schedule);
  return (
    <ul className="space-y-1.5">
      {AVAILABILITY_DAY_KEYS.map((day) => {
        const slots = n[day];
        if (slots.length === 0) return null;
        return (
          <li key={day} className="text-slate-800">
            <span className="font-medium text-slate-900">{AVAILABILITY_DAY_LABELS[day]}:</span>{" "}
            {slots.map((s) => AVAILABILITY_TIME_LABELS[s]).join(", ")}
          </li>
        );
      })}
    </ul>
  );
}
