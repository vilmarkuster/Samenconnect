/**
 * Zorenta admin access control.
 * Minimal role check using existing profiles.role. No auth rewrites.
 */

import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

export const ADMIN_ROLE = "admin";

/** Returns true if the request has a valid token and the user's profile has role === 'admin'. */
export async function isAdminFromRequest(req: Request): Promise<boolean> {
  const token = getAccessTokenFromRequest(req);
  if (!token) return false;
  const supabase = getZorentaSupabaseClient(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === ADMIN_ROLE;
}

/** Use in API routes: get current user and ensure they are admin. Returns { ok: true, userId, supabase } or { ok: false, status, body }. */
export async function requireAdmin(req: Request): Promise<
  | { ok: true; userId: string; supabase: ReturnType<typeof getZorentaSupabaseClient> }
  | { ok: false; status: number; body: { error: string } }
> {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return { ok: false, status: 401, body: { error: "Missing Authorization header (Bearer token)." } };
  }
  const supabase = getZorentaSupabaseClient(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, body: { error: "Invalid or expired token." } };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== ADMIN_ROLE) {
    return { ok: false, status: 403, body: { error: "Forbidden. Admin only." } };
  }
  return { ok: true, userId: user.id, supabase };
}
