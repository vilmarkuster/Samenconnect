import type { LocationSearchHit } from "@/lib/locations/types";

const DEFAULT_LIMIT = 10;

export async function searchNlLocations(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: String(DEFAULT_LIMIT) });
  const res = await fetch(`/api/locations/search?${params.toString()}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: LocationSearchHit[] };
  return Array.isArray(data.places) ? data.places : [];
}
