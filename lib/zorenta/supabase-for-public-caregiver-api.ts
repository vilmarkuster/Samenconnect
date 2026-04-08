import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccessTokenFromRequest, getZorentaSupabaseClient } from "@/lib/zorenta/supabase-server";
import { getSupabaseServiceRoleClient } from "@/lib/zorenta/supabase-service-role";

/**
 * Supabase client for `/api/zorenta/caregivers/[id]` (and linked reads):
 * 1) Service role when SUPABASE_SERVICE_ROLE_KEY is set — same persisted row as updates (bypasses RLS quirks).
 * 2) Else JWT from Authorization when present — same path as /api/zorenta/me.
 * 3) Else anon singleton.
 */
export function getSupabaseForPublicCaregiverApi(req: NextRequest): SupabaseClient {
  const svc = getSupabaseServiceRoleClient();
  if (svc) return svc;
  const token = getAccessTokenFromRequest(req);
  return getZorentaSupabaseClient(token);
}
