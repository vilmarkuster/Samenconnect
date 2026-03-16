import { SupabaseClient } from "@supabase/supabase-js";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "./supabase-server";

export type AuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string; profile: { id: string; role: string } }
  | { ok: false; status: number; body: { error: string } };

export async function requireZorentaAuth(req: Request): Promise<AuthResult> {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return { ok: false, status: 401, body: { error: "Missing Authorization (Bearer token)." } };
  }
  const supabase = getZorentaSupabaseClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, body: { error: "Invalid or expired token." } };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return { ok: false, status: 403, body: { error: "Profile not found. Complete registration first." } };
  }
  return { ok: true, supabase, userId: user.id, profile: profile as { id: string; role: string } };
}

export function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
