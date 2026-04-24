import type { SupabaseClient } from "@supabase/supabase-js";

/** Drop `care_jobs` rows whose `poster_id` has no matching `profiles` row (avoids broken cards). */
export async function careJobRowsWithExistingPosters<T extends { poster_id: string }>(
  supabase: SupabaseClient,
  rows: T[]
): Promise<T[]> {
  if (!rows.length) return rows;
  const posterIds = [...new Set(rows.map((r) => r.poster_id).filter(Boolean))];
  if (!posterIds.length) return [];
  const { data } = await supabase.from("profiles").select("id").in("id", posterIds);
  const ok = new Set((data ?? []).map((p: { id: string }) => p.id));
  return rows.filter((r) => ok.has(r.poster_id));
}
