type Normalized = string;

function normalizeLocation(value?: string | null): Normalized {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function stripRegioPrefix(normalized: Normalized): Normalized {
  if (normalized.startsWith("regio ")) return normalized.replace(/^regio\s+/, "");
  return normalized;
}

// Broad regions (MVP approximation)
const RANDSTAD_CITIES = new Set([
  "amsterdam",
  "rotterdam",
  "den haag",
  "utrecht",
  "haarlem",
  "almere",
  "leiden",
  "zaandam",
  "amstelveen",
  "hoofddorp",
  "hilversum",
  "dordrecht",
  "schiedam",
  "zoetermeer",
]);

const CITY_DISTANCE_KM: Record<string, number> = {
  // Key nearby examples
  "amsterdam|amstelveen": 5,
  "amsterdam|haarlem": 10,
  "amsterdam|zaandam": 7,
  "amsterdam|utrecht": 35,
  "amsterdam|almere": 30,
  "amsterdam|leiden": 20,

  "utrecht|amersfoort": 20,

  "rotterdam|den haag": 25,
  "rotterdam|dordrecht": 30,

  "den haag|leiden": 25,
  "den haag|zoetermeer": 12,
  "den haag|rotterdam": 25,
};

function pairKey(a: Normalized, b: Normalized) {
  return `${a}|${b}`;
}

export function estimateDistanceKm(
  fromLocation?: string | null,
  toCity?: string | null
): number {
  const fromNorm = normalizeLocation(fromLocation);
  const toNorm = normalizeLocation(toCity);
  if (!fromNorm || !toNorm) return 999;
  if (fromNorm === toNorm) return 0;

  // Handle region-style values like "Regio Amsterdam" / "Randstad"
  const fromBase = stripRegioPrefix(fromNorm);
  if (fromNorm === "randstad" || fromBase === "randstad") {
    return RANDSTAD_CITIES.has(toNorm) ? 20 : 80;
  }
  if (fromNorm.startsWith("regio ")) {
    // Treat "Regio X" as if the user targets city X for MVP purposes.
    // (Distance then comes from city pair table / fallback.)
    return estimateDistanceKm(fromBase, toNorm);
  }

  const direct =
    CITY_DISTANCE_KM[pairKey(fromNorm, toNorm)] ??
    CITY_DISTANCE_KM[pairKey(toNorm, fromNorm)];
  if (direct != null) return direct;

  // Fallback heuristics: same broad region = medium, otherwise far.
  const fromIsRandstad = RANDSTAD_CITIES.has(fromNorm);
  const toIsRandstad = RANDSTAD_CITIES.has(toNorm);
  if (fromIsRandstad && toIsRandstad) return 35;

  // Unknown/far default
  return 80;
}

