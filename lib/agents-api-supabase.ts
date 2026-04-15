import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlatformSupabaseServerClient } from "@/lib/platform-supabase-server";
import { getAccessTokenFromRequest, getZorentaSupabaseClient } from "@/lib/zorenta/supabase-server";

/**
 * Supabase client for `/api/agents*`: use `Authorization: Bearer` (Zorenta / same Supabase JWT)
 * when present so RLS sees `auth.uid()`; otherwise fall back to SSR cookies.
 * Without this, Zorenta pages that only send Bearer hit RLS as anon and `agents` reads fail.
 */
export function getSupabaseForAgentsApi(req: NextRequest): SupabaseClient {
  const token = getAccessTokenFromRequest(req);
  if (token) return getZorentaSupabaseClient(token);
  return getPlatformSupabaseServerClient(req);
}
