/**
 * Shared display formatting for SamenConnect profiles (names, locations, labels, certs, languages).
 */

/** Known Dutch care / labour acronyms — keep uppercase. */
const ACRONYM_MAP: Record<string, string> = {
  vog: "VOG",
  big: "BIG",
  zzp: "ZZP",
  skj: "SKJ",
  vig: "VIG",
  vca: "VCA",
  ehbo: "EHBO",
  bls: "BLS",
  nvv: "NVV",
  nvz: "NVZ",
  vvt: "VVT",
  pgb: "PGB",
  wlz: "WLZ",
  wmo: "WMO",
  ig: "IG",
};

function titleCaseWord(word: string): string {
  const w = word.trim();
  if (!w) return "";
  const lower = w.toLowerCase();
  if (ACRONYM_MAP[lower]) return ACRONYM_MAP[lower];
  if (w.includes("-")) {
    return w
      .split("-")
      .map((part) => {
        const pl = part.toLowerCase();
        if (ACRONYM_MAP[pl]) return ACRONYM_MAP[pl];
        if (!part) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("-");
  }
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/** Title case for ordinary words; handles hyphens (e.g. Noord-Holland). */
export function formatLabelValue(value?: string | null): string {
  if (value == null || typeof value !== "string") return "";
  const t = value.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => titleCaseWord(w))
    .join(" ");
}

/** One token/phrase: acronyms preserved, otherwise title case. */
export function formatAcronymAwareLabel(value?: string | null): string {
  if (value == null || typeof value !== "string") return "";
  const t = value.trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  if (ACRONYM_MAP[lower]) return ACRONYM_MAP[lower];
  return formatLabelValue(t);
}

/** Person name: "koen care" → "Koen Care". */
export function formatDisplayName(value?: string | null): string {
  if (value == null || typeof value !== "string") return "";
  const t = value.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => titleCaseWord(w))
    .join(" ");
}

/** City / region / country segment: hyphen-aware title case. */
export function formatLocationPart(value?: string | null): string | null {
  if (value == null || typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  return t
    .split(/\s+/)
    .map((w) => titleCaseWord(w))
    .join(" ");
}

export function formatLocationLine(
  city?: string | null,
  region?: string | null,
  country?: string | null
): string | null {
  const parts = [formatLocationPart(city), formatLocationPart(region), formatLocationPart(country)].filter(
    Boolean
  ) as string[];
  return parts.length ? parts.join(", ") : null;
}

/** Language names: "nederlands, engels" → "Nederlands, Engels". */
export function formatLanguageLabel(value?: string | null): string {
  return formatLabelValue(value);
}

/** Certification line: acronym-aware per segment. */
export function formatCertificationLabel(value?: string | null): string {
  return formatAcronymAwareLabel(value);
}

/**
 * Parse certifications or languages from DB: array, comma-separated string, or accidental JSON string.
 */
export function parseStringListFromMixed(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    } catch {
      // fall through: strip brackets
    }
    const inner = s.slice(1, -1).trim();
    return inner
      .split(/["']?\s*,\s*["']?/)
      .map((x) => x.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);
  }
  return s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
}
