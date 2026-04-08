"use client";

import { ZorentaFormField } from "@/components/zorenta/form-field";
import {
  AVAILABILITY_DAY_KEYS,
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_TIME_LABELS,
  AVAILABILITY_TIME_SLOTS,
  type AvailabilityDayKey,
  type AvailabilitySchedule,
  type AvailabilityTimeSlot,
} from "@/lib/zorenta/caregiver-availability-schedule";

type Props = {
  value: AvailabilitySchedule;
  onChange: (next: AvailabilitySchedule) => void;
};

function toggleSlot(
  schedule: AvailabilitySchedule,
  day: AvailabilityDayKey,
  slot: AvailabilityTimeSlot
): AvailabilitySchedule {
  const current = schedule[day];
  const has = current.includes(slot);
  const nextSlots = has ? current.filter((s) => s !== slot) : [...current, slot].sort(
    (a, b) => AVAILABILITY_TIME_SLOTS.indexOf(a) - AVAILABILITY_TIME_SLOTS.indexOf(b)
  );
  return { ...schedule, [day]: nextSlots };
}

export function AvailabilityScheduleGrid({ value, onChange }: Props) {
  return (
    <ZorentaFormField
      label="Beschikbaar per dag"
      hint="Kies per dag de tijden waarop je beschikbaar bent. Geen tijden = die dag niet beschikbaar."
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className="px-2 py-2 text-left font-medium text-slate-600 sm:px-3">Dag</th>
              {AVAILABILITY_TIME_SLOTS.map((t) => (
                <th key={t} className="px-1 py-2 text-center font-medium text-slate-600 sm:px-2">
                  <span className="hidden sm:inline">{AVAILABILITY_TIME_LABELS[t]}</span>
                  <span className="sm:hidden" title={AVAILABILITY_TIME_LABELS[t]}>
                    {t === "ochtend" ? "O" : t === "middag" ? "M" : t === "avond" ? "A" : "N"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AVAILABILITY_DAY_KEYS.map((day) => (
              <tr key={day} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-slate-800 sm:px-3">
                  {AVAILABILITY_DAY_LABELS[day]}
                </td>
                {AVAILABILITY_TIME_SLOTS.map((slot) => {
                  const selected = value[day].includes(slot);
                  return (
                    <td key={slot} className="px-1 py-1 text-center sm:px-2">
                      <button
                        type="button"
                        onClick={() => onChange(toggleSlot(value, day, slot))}
                        className={`h-9 w-full min-w-[2.25rem] rounded-lg border text-xs font-medium transition-colors sm:h-8 ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        aria-pressed={selected}
                        aria-label={`${AVAILABILITY_DAY_LABELS[day]} ${AVAILABILITY_TIME_LABELS[slot]}: ${
                          selected ? "beschikbaar" : "niet beschikbaar"
                        }`}
                      >
                        <span className="sr-only sm:not-sr-only">{selected ? "✓" : "—"}</span>
                        <span className="sm:hidden">{selected ? "✓" : ""}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ZorentaFormField>
  );
}
