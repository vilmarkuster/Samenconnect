import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeNlPlaceName } from "@/lib/locations/normalize-nl-place";
import type { LocationSearchHit } from "@/lib/locations/types";

const MIN_LEN = 2;
const MAX_DEFAULT = 10;
/** Per subquery; genoeg ruimte om na merge+dedupe te ranken. */
const FETCH_EACH = 40;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type Row = {
  name: string;
  municipality: string | null;
  province: string | null;
  normalized_name: string;
};

function mergeAndRank(rows: Row[], norm: string, qRaw: string, limit: number): LocationSearchHit[] {
  const seen = new Set<string>();
  const deduped: Row[] = [];
  for (const r of rows) {
    const k = (r.normalized_name || normalizeNlPlaceName(r.name)).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  const qLower = qRaw.trim().toLowerCase();
  const nameLower = (s: string) => s.toLowerCase();

  function tier(r: Row): number {
    const n = r.normalized_name || "";
    if (n.startsWith(norm)) return 0;
    if (nameLower(r.name).startsWith(qLower)) return 1;
    if (n.includes(norm)) return 2;
    if (nameLower(r.name).includes(qLower)) return 3;
    return 4;
  }

  deduped.sort((a, b) => {
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name, "nl");
  });

  return deduped.slice(0, limit).map(({ name, municipality, province }) => ({
    name,
    municipality,
    province,
  }));
}

export async function GET(req: NextRequest) {
  const qRaw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? MAX_DEFAULT);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, Math.floor(limitParam)), 10)
    : MAX_DEFAULT;

  if (qRaw.length < MIN_LEN) {
    return NextResponse.json({ places: [] as LocationSearchHit[] });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase-omgeving ontbreekt." }, { status: 503 });
  }

  const norm = normalizeNlPlaceName(qRaw);
  const esc = escapeIlike(norm);
  const patternContains = `%${esc}%`;
  const patternNormPrefix = `${esc}%`;

  const supabase = createClient(url, key);

  const [prefixRes, normContainsRes, nameContainsRes] = await Promise.all([
    supabase
      .from("locations")
      .select("name,municipality,province,normalized_name")
      .eq("is_active", true)
      .ilike("normalized_name", patternNormPrefix)
      .limit(FETCH_EACH),
    supabase
      .from("locations")
      .select("name,municipality,province,normalized_name")
      .eq("is_active", true)
      .ilike("normalized_name", patternContains)
      .limit(FETCH_EACH),
    supabase
      .from("locations")
      .select("name,municipality,province,normalized_name")
      .eq("is_active", true)
      .ilike("name", patternContains)
      .limit(FETCH_EACH),
  ]);

  const err = prefixRes.error ?? normContainsRes.error ?? nameContainsRes.error;
  if (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  /** Volgorde: prefix-match eerst in de merge, daarna contains (PostgREST .or vermijden). */
  const combined: Row[] = [
    ...((prefixRes.data ?? []) as Row[]),
    ...((normContainsRes.data ?? []) as Row[]),
    ...((nameContainsRes.data ?? []) as Row[]),
  ];

  const places = mergeAndRank(combined, norm, qRaw, limit);
  return NextResponse.json({ places });
}
