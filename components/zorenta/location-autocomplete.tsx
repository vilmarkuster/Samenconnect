"use client";

import { useEffect, useMemo, useState } from "react";
import { formatLocation } from "@/lib/zorenta/formatters";
import { DUTCH_LOCATIONS } from "@/lib/zorenta/locations";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
};

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

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const suggestions = useMemo(() => {
    const normalized = draft.trim().toLowerCase();
    if (!normalized) return [];
    const startsWith = DUTCH_LOCATIONS.filter((c) =>
      c.toLowerCase().startsWith(normalized)
    );
    const includes = DUTCH_LOCATIONS.filter(
      (c) =>
        !startsWith.includes(c) && c.toLowerCase().includes(normalized)
    );
    return [...startsWith, ...includes].slice(0, 8);
  }, [draft]);

  function commit(valueToCommit: string) {
    const formatted = formatLocation(valueToCommit);
    setDraft(formatted);

    // Avoid triggering parent updates when value didn't change.
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
          // commit current draft on blur
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
              commitAndClose(suggestions[highlightedIndex]);
              return;
            }

            const normalized = draft.trim().toLowerCase();
            const exact = DUTCH_LOCATIONS.find((c) => c.toLowerCase() === normalized);
            if (exact) {
              commitAndClose(exact);
              return;
            }

            // If typed value doesn't match a known location, keep draft as-is.
            setIsFocused(false);
            setHighlightedIndex(-1);
            return;
          }

          if (e.key === "Tab") {
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
              e.preventDefault();
              commitAndClose(suggestions[highlightedIndex]);
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
      {isFocused && suggestions.length > 0 && (
        <div className="mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white text-xs text-slate-700 shadow-lg">
          {suggestions.map((city, idx) => (
            <button
              key={city}
              type="button"
              className={[
                "flex w-full items-center px-3 py-1.5 text-left hover:bg-slate-50",
                idx === highlightedIndex ? "bg-slate-50" : "",
              ].join(" ")}
              onMouseDown={(e) => {
                // prevent blur before selection
                e.preventDefault();
                commitAndClose(city);
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

