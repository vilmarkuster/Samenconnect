"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_CAREGIVERS } from "@/lib/zorenta/mock-caregivers";
import { DUTCH_LOCATIONS } from "@/lib/zorenta/locations";
import { formatLocation } from "@/lib/zorenta/formatters";

const CARE_TYPES = [
  "Thuiszorg",
  "Begeleiding",
  "Persoonlijke verzorging",
  "Huishoudelijke hulp",
  "Dagbesteding",
] as const;

type LocationSuggestion = string;
type CaregiverSuggestion = { id: string; name: string };
type CareTypeSuggestion = (typeof CARE_TYPES)[number];
type OrganisationSuggestion = { id: string; name: string };

function toLowerSafe(s: string) {
  return s.toLowerCase();
}

function startsWithThenIncludes(list: string[], query: string, max = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const startsWith = list.filter((x) => toLowerSafe(x).startsWith(q));
  const includes = list.filter(
    (x) => !startsWith.includes(x) && toLowerSafe(x).includes(q)
  );
  return [...startsWith, ...includes].slice(0, max);
}

type Props = {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelectLocation: (location: string) => void;
  onSelectCaregiver: (caregiverId: string) => void;
  onSelectCareType: (careType: string) => void;
};

export function GlobalSearchAutocomplete({
  value,
  placeholder,
  onValueChange,
  onSubmit,
  onSelectLocation,
  onSelectCaregiver,
  onSelectCareType,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const groupedSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) {
      return {
        locations: [] as LocationSuggestion[],
        careTypes: [] as CareTypeSuggestion[],
        caregivers: [] as CaregiverSuggestion[],
        organisations: [] as OrganisationSuggestion[],
      };
    }

    const locations = startsWithThenIncludes(
      DUTCH_LOCATIONS as unknown as string[],
      q
    );

    const careTypes = startsWithThenIncludes(
      CARE_TYPES as unknown as string[],
      q
    ) as CareTypeSuggestion[];

    const caregiversAll = MOCK_CAREGIVERS.filter(
      (c) => c.role !== "Organisatie"
    ).map((c) => ({ id: c.id, name: c.name }));

    const caregiversStarts = caregiversAll.filter((c) =>
      toLowerSafe(c.name).startsWith(q)
    );
    const caregiversIncludes = caregiversAll.filter(
      (c) =>
        !caregiversStarts.some((s) => s.id === c.id) &&
        toLowerSafe(c.name).includes(q)
    );
    const caregivers = [...caregiversStarts, ...caregiversIncludes].slice(0, 8);

    const organisationsAll = MOCK_CAREGIVERS.filter(
      (c) => c.role === "Organisatie"
    ).map((c) => ({ id: c.id, name: c.name }));

    const orgStarts = organisationsAll.filter((o) =>
      toLowerSafe(o.name).startsWith(q)
    );
    const orgIncludes = organisationsAll.filter(
      (o) =>
        !orgStarts.some((s) => s.id === o.id) &&
        toLowerSafe(o.name).includes(q)
    );
    const organisations = [...orgStarts, ...orgIncludes].slice(0, 8);

    return { locations, careTypes, caregivers, organisations };
  }, [draft]);

  useEffect(() => {
    const hasAny =
      groupedSuggestions.locations.length > 0 ||
      groupedSuggestions.careTypes.length > 0 ||
      groupedSuggestions.caregivers.length > 0 ||
      groupedSuggestions.organisations.length > 0;
    setOpen(Boolean(draft.trim()) && hasAny);
  }, [draft, groupedSuggestions]);

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder ?? "Zoek opdrachten, locatie, zorgtype..."}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            onValueChange(next);
          }}
          onFocus={() => {
            if (draft.trim().length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit(draft);
              setOpen(false);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-[#40ADA8] focus:bg-white focus:ring-4 focus:ring-[#40ADA8]/15"
          autoComplete="off"
        />
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-2">
            {/* Locaties */}
            {groupedSuggestions.locations.length > 0 && (
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Locaties
                </p>
                <div className="mt-1 space-y-0.5">
                  {groupedSuggestions.locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectLocation(formatLocation(loc));
                        setOpen(false);
                      }}
                    >
                      <span>{loc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zorgtypes */}
            {groupedSuggestions.careTypes.length > 0 && (
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Zorgtypes
                </p>
                <div className="mt-1 space-y-0.5">
                  {groupedSuggestions.careTypes.map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectCareType(ct);
                        setOpen(false);
                      }}
                    >
                      <span>{ct}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zorgverleners */}
            {groupedSuggestions.caregivers.length > 0 && (
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Zorgverleners
                </p>
                <div className="mt-1 space-y-0.5">
                  {groupedSuggestions.caregivers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectCaregiver(c.id);
                        setOpen(false);
                      }}
                    >
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Organisaties */}
            {groupedSuggestions.organisations.length > 0 && (
              <div className="px-3 py-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Organisaties
                </p>
                <div className="mt-1 space-y-0.5">
                  {groupedSuggestions.organisations.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onSelectCaregiver(o.id);
                        setOpen(false);
                      }}
                    >
                      <span>{o.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

