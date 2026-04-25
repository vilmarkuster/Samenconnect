"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchNlLocations } from "@/lib/locations/search-client";
import type { LocationSearchHit } from "@/lib/locations/types";
import { provinceFromDutchCityName } from "@/lib/zorenta/nl-city-province";

export type CityAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  /** Fires when the user picks a row from the location index (includes province when known). */
  onLocationPick?: (hit: LocationSearchHit) => void;
  /** Best-effort province guess from typed city (static map); debounced. Only called when a province is known. */
  onProvinceGuess?: (province: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
};

function subtitle(hit: LocationSearchHit): string | null {
  const parts = [hit.municipality, hit.province].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0 && x !== hit.name
  );
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function CityAutocomplete({
  value,
  onChange,
  onLocationPick,
  onProvinceGuess,
  placeholder,
  id,
  name,
  "aria-invalid": ariaInvalid,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<LocationSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    if (!onProvinceGuess) return;
    const v = (value ?? "").trim();
    if (v.length < 2) return;
    const t = window.setTimeout(() => {
      const p = provinceFromDutchCityName(v);
      if (p) onProvinceGuess(p);
    }, 450);
    return () => window.clearTimeout(t);
  }, [value, onProvinceGuess]);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current = new AbortController();
      const ac = abortRef.current;
      searchNlLocations(q, ac.signal)
        .then((hits) => {
          if (ac.signal.aborted) return;
          setSuggestions(hits);
          setActiveIndex(0);
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const hasMatches = suggestions.length > 0;
  const showPanel = open && query.trim().length >= 2;

  function selectValue(next: string, hit?: LocationSearchHit) {
    setQuery(next);
    onChange(next);
    setOpen(false);
    if (hit) onLocationPick?.(hit);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!hasMatches) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (open && suggestions[activeIndex]) {
        e.preventDefault();
        selectValue(suggestions[activeIndex].name, suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  }

  function handleBlur() {
    blurTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  function handleFocus() {
    if (blurTimeoutRef.current != null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (query.trim().length >= 2) setOpen(true);
  }

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        aria-invalid={ariaInvalid}
        placeholder={placeholder ?? "Bijv. Amsterdam"}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange(next);
          if (next.trim().length >= 2) {
            setOpen(true);
            setActiveIndex(0);
          } else {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="rounded-lg border-slate-200 bg-white"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showPanel}
      />
      {showPanel && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-500">Zoeken…</div>
          )}
          {!loading && !hasMatches && (
            <div className="px-3 py-2 text-xs text-slate-500">Geen resultaten</div>
          )}
          {!loading &&
            hasMatches &&
            suggestions.map((hit, idx) => {
              const sub = subtitle(hit);
              return (
                <button
                  key={`${hit.name}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimeoutRef.current != null) {
                      window.clearTimeout(blurTimeoutRef.current);
                      blurTimeoutRef.current = null;
                    }
                    selectValue(hit.name, hit);
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50 ${
                    idx === activeIndex ? "bg-slate-50" : ""
                  }`}
                >
                  <span className="font-medium text-slate-800">{hit.name}</span>
                  {sub ? <span className="text-xs text-slate-500">{sub}</span> : null}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
