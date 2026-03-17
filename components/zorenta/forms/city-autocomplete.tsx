 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export type CityAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const CITY_SUGGESTIONS = [
  "Amsterdam",
  "Rotterdam",
  "Den Haag",
  "Utrecht",
  "Eindhoven",
  "Tilburg",
  "Groningen",
  "Almere",
  "Breda",
  "Nijmegen",
  "Arnhem",
  "Apeldoorn",
  "Haarlem",
  "Enschede",
  "Amersfoort",
  "Zaanstad",
  "Zwolle",
  "Zoetermeer",
  "Leiden",
  "Dordrecht",
  "Ede",
  "Westland",
  "Venlo",
  "Delft",
  "Deventer",
  "Heerlen",
  "Zevenaar",
  "Hilversum",
  "Hoorn",
  "Oss",
  "Roermond",
  "Gouda",
  "Veenendaal",
  "Alkmaar",
  "Assen",
  "Lelystad",
  "Maastricht",
  "Leeuwarden",
  "Emmen",
  "Helmond",
] as const;

export function CityAutocomplete({ value, onChange, placeholder }: CityAutocompleteProps) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const startsWith = CITY_SUGGESTIONS.filter((c) => c.toLowerCase().startsWith(q));
    const includes = CITY_SUGGESTIONS.filter(
      (c) => !startsWith.includes(c) && c.toLowerCase().includes(q),
    );
    return [...startsWith, ...includes].slice(0, 8);
  }, [query]);

  const hasMatches = matches.length > 0;

  function selectValue(next: string) {
    setQuery(next);
    onChange(next);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!hasMatches) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (open && matches[activeIndex]) {
        e.preventDefault();
        selectValue(matches[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  }

  function handleBlur() {
    // Kleine delay zodat klik op suggestie nog kan registreren
    blurTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  function handleFocus() {
    if (blurTimeoutRef.current != null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    if (hasMatches) setOpen(true);
  }

  return (
    <div className="relative">
      <Input
        placeholder={placeholder ?? "Bijv. Amsterdam"}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          onChange(next);
          if (next.trim()) {
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
      />
      {open && hasMatches && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white text-sm shadow-lg">
          {matches.map((city, idx) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => {
                // voorkom dat blur de selectie annuleert
                e.preventDefault();
                if (blurTimeoutRef.current != null) {
                  window.clearTimeout(blurTimeoutRef.current);
                  blurTimeoutRef.current = null;
                }
                selectValue(city);
              }}
              className={`flex w-full items-center px-3 py-2 text-left hover:bg-slate-50 ${
                idx === activeIndex ? "bg-slate-50" : ""
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

