import type { SupabaseClient } from "@supabase/supabase-js";

/** Latest `public.caregivers.id` per `profile_id` (when multiple rows exist). */
export async function latestMarketplaceCaregiverIdByProfileId(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, string>> {
  const uniq = [...new Set(profileIds.filter(Boolean))];
  if (!uniq.length) return new Map();

  const { data } = await supabase.from("caregivers").select("id, profile_id, created_at").in("profile_id", uniq);

  const best = new Map<string, { id: string; t: number }>();
  for (const row of data ?? []) {
    const r = row as { id: string; profile_id: string; created_at?: string | null };
    const pid = String(r.profile_id);
    const id = String(r.id);
    const t = r.created_at ? Date.parse(String(r.created_at)) : 0;
    const prev = best.get(pid);
    if (!prev || t >= prev.t) best.set(pid, { id, t });
  }
  return new Map([...best.entries()].map(([pid, v]) => [pid, v.id]));
}
