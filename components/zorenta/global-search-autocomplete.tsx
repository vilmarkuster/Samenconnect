"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { formatLocation } from "@/lib/zorenta/formatters";
import { searchNlLocations } from "@/lib/locations/search-client";

const CARE_TYPES = [
  "Thuiszorg",
  "Begeleiding",
  "Persoonlijke verzorging",
  "Huishoudelijke hulp",
  "Dagbesteding",
] as const;

type CaregiverSuggestion = { id: string; name: string };
type CareTypeSuggestion = (typeof CARE_TYPES)[number];

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
  onSelectCaregiver: (caregiverProfileId: string) => void;
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
  const [locationLabels, setLocationLabels] = useState<string[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [caregiverSuggestions, setCaregiverSuggestions] = useState<CaregiverSuggestion[]>([]);
  const [caregiverLoading, setCaregiverLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const debounceCgRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const abortCgRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const q = draft.trim();
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2) {
      setLocationLabels([]);
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current = new AbortController();
      const ac = abortRef.current;
      searchNlLocations(q, ac.signal)
        .then((hits) => {
          if (ac.signal.aborted) return;
          setLocationLabels(hits.map((h) => h.name));
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          setLocationLabels([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLocationLoading(false);
        });
    }, 220);

    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [draft]);

  useEffect(() => {
    const q = draft.trim();
    if (debounceCgRef.current != null) window.clearTimeout(debounceCgRef.current);
    if (abortCgRef.current) abortCgRef.current.abort();

    if (q.length < 2) {
      setCaregiverSuggestions([]);
      setCaregiverLoading(false);
      return;
    }

    setCaregiverLoading(true);
    debounceCgRef.current = window.setTimeout(() => {
      abortCgRef.current = new AbortController();
      const ac = abortCgRef.current;
      void (async () => {
        try {
          const token = await getZorentaAccessToken();
          const params = new URLSearchParams({ type: "caregivers", q });
          const res = await fetch(`/api/zorenta/search?${params}`, {
            headers: zorentaHeaders(token),
            signal: ac.signal,
          });
          const d = await res.json().catch(() => ({}));
          if (ac.signal.aborted) return;
          const list: {
            profile_id?: string;
            headline?: string | null;
            profile?: { display_name?: string | null };
          }[] = Array.isArray(d.caregivers) ? d.caregivers : [];
          const mapped: CaregiverSuggestion[] = list.slice(0, 8).map((c) => {
            const pid = String(c.profile_id ?? "").trim();
            const name =
              (typeof c.profile?.display_name === "string" && c.profile.display_name.trim()) ||
              (typeof c.headline === "string" && c.headline.trim()) ||
              "Zorgverlener";
            return { id: pid, name };
          });
          setCaregiverSuggestions(mapped.filter((x) => x.id.length > 0));
        } catch {
          if (!ac.signal.aborted) setCaregiverSuggestions([]);
        } finally {
          if (!ac.signal.aborted) setCaregiverLoading(false);
        }
      })();
    }, 280);

    return () => {
      if (debounceCgRef.current != null) window.clearTimeout(debounceCgRef.current);
      if (abortCgRef.current) abortCgRef.current.abort();
    };
  }, [draft]);

  const groupedSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) {
      return {
        locations: [] as string[],
        careTypes: [] as CareTypeSuggestion[],
        caregivers: [] as CaregiverSuggestion[],
      };
    }

    const careTypes = startsWithThenIncludes(
      CARE_TYPES as unknown as string[],
      q
    ) as CareTypeSuggestion[];

    return { locations: locationLabels, careTypes, caregivers: caregiverSuggestions };
  }, [draft, locationLabels, caregiverSuggestions]);

  useEffect(() => {
    const q = draft.trim();
    const hasLocations = q.length >= 2 && (locationLabels.length > 0 || locationLoading);
    const hasCaregiverHits = q.length >= 2 && (caregiverSuggestions.length > 0 || caregiverLoading);
    const hasShortQueryHits =
      q.length > 0 &&
      (groupedSuggestions.careTypes.length > 0 || groupedSuggestions.caregivers.length > 0);
    setOpen(Boolean(q && (hasLocations || hasCaregiverHits || hasShortQueryHits)));
  }, [draft, groupedSuggestions, locationLabels.length, locationLoading, caregiverSuggestions.length, caregiverLoading]);

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
            {draft.trim().length >= 2 && locationLoading && (
              <div className="px-3 py-1.5 text-xs text-slate-500">Locaties zoeken…</div>
            )}
            {draft.trim().length >= 2 && caregiverLoading && (
              <div className="px-3 py-1.5 text-xs text-slate-500">Zorgverleners zoeken…</div>
            )}
            {draft.trim().length >= 2 &&
              !locationLoading &&
              !caregiverLoading &&
              groupedSuggestions.locations.length === 0 &&
              groupedSuggestions.careTypes.length === 0 &&
              groupedSuggestions.caregivers.length === 0 && (
                <div className="px-3 py-1.5 text-xs text-slate-500">Geen suggesties</div>
              )}

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
          </div>
        </div>
      )}
    </div>
  );
}
