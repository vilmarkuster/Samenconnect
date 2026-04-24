import type { SupabaseClient } from "@supabase/supabase-js";

export function escapePostgrestIlike(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, " ");
}

function tokenizeSearch(qText: string): string[] {
  const raw = qText.trim();
  if (!raw) return [];
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9à-ÿ-]+/gi, ""))
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}

async function profileIdsMatchingToken(supabase: SupabaseClient, token: string): Promise<Set<string>> {
  const safe = escapePostgrestIlike(token);
  const ids = new Set<string>();
  const { data: profs } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "caregiver")
    .ilike("display_name", `%${safe}%`)
    .limit(120);
  (profs ?? []).forEach((r) => ids.add(String((r as { id: string }).id)));
  const { data: cps } = await supabase
    .from("caregiver_profiles")
    .select("profile_id")
    .or(`headline.ilike.%${safe}%,bio.ilike.%${safe}%,city.ilike.%${safe}%`)
    .limit(150);
  (cps ?? []).forEach((r) => ids.add(String((r as { profile_id: string }).profile_id)));
  return ids;
}

/**
 * `profiles.id` values (caregiver) matching free-text search.
 */
export async function caregiverProfileIdsForSearchQuery(
  supabase: SupabaseClient,
  qText: string
): Promise<string[]> {
  let tokens = tokenizeSearch(qText);
  if (!tokens.length) {
    const one = qText.trim().toLowerCase().replace(/[^a-z0-9à-ÿ-]+/gi, "");
    if (one.length >= 2) tokens = [one];
    else return [];
  }

  const perToken = await Promise.all(tokens.map((t) => profileIdsMatchingToken(supabase, t)));

  if (tokens.length === 1) {
    return [...perToken[0]!];
  }

  let inter = new Set(perToken[0]!);
  for (let i = 1; i < perToken.length; i++) {
    const next = perToken[i]!;
    inter = new Set([...inter].filter((id) => next.has(id)));
  }
  if (inter.size > 0) return [...inter];

  const union = new Set<string>();
  perToken.forEach((s) => s.forEach((id) => union.add(id)));
  const unionIds = [...union];
  if (!unionIds.length) return [];

  const { data: rows } = await supabase
    .from("caregiver_profiles")
    .select("profile_id, headline, bio, city, skills, care_types")
    .in("profile_id", unionIds.slice(0, 220));

  const { data: profRows } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unionIds.slice(0, 220))
    .eq("role", "caregiver");

  const pmap = Object.fromEntries(
    (profRows ?? []).map((p) => [String((p as { id: string }).id), (p as { display_name: string | null }).display_name])
  );

  const out: string[] = [];
  for (const r of rows ?? []) {
    const row = r as {
      profile_id: string;
      headline?: string | null;
      bio?: string | null;
      city?: string | null;
      skills?: string[] | null;
      care_types?: string[] | null;
    };
    const blob = [
      pmap[row.profile_id] ?? "",
      row.headline,
      row.bio,
      row.city,
      ...(row.skills ?? []),
      ...(row.care_types ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (tokens.every((t) => blob.includes(t))) out.push(String(row.profile_id));
  }
  return [...new Set(out)];
}
