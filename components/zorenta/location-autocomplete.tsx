"use client";

import { useEffect, useRef, useState } from "react";
import { formatLocation } from "@/lib/zorenta/formatters";
import { searchNlLocations } from "@/lib/locations/search-client";
import type { LocationSearchHit } from "@/lib/locations/types";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
};

function subtitle(hit: LocationSearchHit): string | null {
  const parts = [hit.municipality, hit.province].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0 && x !== hit.name
  );
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputClassName,
}: LocationAutocompleteProps) {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [suggestions, setSuggestions] = useState<LocationSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const q = draft.trim();
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
  }, [draft]);

  function commit(valueToCommit: string) {
    const formatted = formatLocation(valueToCommit);
    setDraft(formatted);

    const currentFormatted = formatLocation(value);
    const isSame = formatted === currentFormatted;

    if (!isSame) {
      onChange(formatted);
    }
  }

  function commitAndClose(valueToCommit: string) {
    commit(valueToCommit);
    setIsFocused(false);
    setHighlightedIndex(-1);
  }

  useEffect(() => {
    if (!isFocused) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex(suggestions.length > 0 ? 0 : -1);
  }, [draft, isFocused, suggestions.length]);

  const showList = isFocused && draft.trim().length >= 2;

  return (
    <div className="relative w-full">
      <input
        type="text"
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
        }}
        onBlur={() => {
          setIsFocused(false);
          setHighlightedIndex(-1);
          commit(draft);
        }}
        onFocus={() => {
          setIsFocused(true);
          setHighlightedIndex(suggestions.length > 0 ? 0 : -1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setIsFocused(false);
            setHighlightedIndex(-1);
            return;
          }

          if (e.key === "ArrowDown") {
            if (suggestions.length === 0) return;
            e.preventDefault();
            setHighlightedIndex((prev) => {
              const next = prev < 0 ? 0 : prev + 1;
              return next >= suggestions.length ? 0 : next;
            });
            return;
          }

          if (e.key === "ArrowUp") {
            if (suggestions.length === 0) return;
            e.preventDefault();
            setHighlightedIndex((prev) => {
              const next = prev < 0 ? suggestions.length - 1 : prev - 1;
              return next < 0 ? suggestions.length - 1 : next;
            });
            return;
          }

          if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
              commitAndClose(suggestions[highlightedIndex].name);
              return;
            }

            const normalized = draft.trim().toLowerCase();
            const exact = suggestions.find((h) => h.name.toLowerCase() === normalized);
            if (exact) {
              commitAndClose(exact.name);
              return;
            }

            setIsFocused(false);
            setHighlightedIndex(-1);
            return;
          }

          if (e.key === "Tab") {
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
              e.preventDefault();
              commitAndClose(suggestions[highlightedIndex].name);
            }
            return;
          }
        }}
        placeholder={placeholder}
        className={
          inputClassName ??
          "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#40ADA8] focus:outline-none focus:ring-2 focus:ring-[#40ADA8]/20"
        }
      />
      {showList && (
        <div className="mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs text-slate-700 shadow-lg">
          {loading && <div className="px-3 py-1.5 text-slate-500">Zoeken…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-1.5 text-slate-500">Geen resultaten</div>
          )}
          {!loading &&
            suggestions.map((hit, idx) => {
              const sub = subtitle(hit);
              return (
                <button
                  key={`${hit.name}-${idx}`}
                  type="button"
                  className={[
                    "flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-slate-50",
                    idx === highlightedIndex ? "bg-slate-50" : "",
                  ].join(" ")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commitAndClose(hit.name);
                  }}
                >
                  <span>{hit.name}</span>
                  {sub ? <span className="text-[10px] text-slate-500">{sub}</span> : null}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
