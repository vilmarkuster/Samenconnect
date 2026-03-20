import { SupabaseClient } from "@supabase/supabase-js";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "./supabase-server";

export type AuthResult =
  | { ok: true; supabase: SupabaseClient; userId: string; profile: { id: string; role: string } }
  | { ok: false; status: number; body: { error: string } };

export async function requireZorentaAuth(req: Request): Promise<AuthResult> {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    // eslint-disable-next-line no-console
    console.error("[requireZorentaAuth] Missing Authorization header");
    return { ok: false, status: 401, body: { error: "Ontbrekende Authorization header (Bearer token)." } };
  }
  const supabase = getZorentaSupabaseClient(token);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    // eslint-disable-next-line no-console
    console.error("[requireZorentaAuth] Invalid session", {
      hasUser: !!user,
      userError: userError?.message,
    });
    return { ok: false, status: 401, body: { error: "Ongeldige of verlopen sessie." } };
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    // eslint-disable-next-line no-console
    console.error("[requireZorentaAuth] Profile not found", {
      userId: user.id,
      profileError: profileError?.message,
    });
    return {
      ok: false,
      status: 403,
      body: { error: "Profiel niet gevonden. Rond eerst je registratie af." },
    };
  }
  if (!profile.role) {
    // eslint-disable-next-line no-console
    console.error("[requireZorentaAuth] Missing role on profile", {
      userId: user.id,
      profileId: profile.id,
    });
    return {
      ok: false,
      status: 403,
      body: {
        error:
          "Er is nog geen rol gekoppeld aan dit account. Neem contact op met support of voltooi je registratie.",
      },
    };
  }
  // eslint-disable-next-line no-console
  console.log("[requireZorentaAuth] OK", {
    userId: user.id,
    role: profile.role,
  });
  return { ok: true, supabase, userId: user.id, profile: profile as { id: string; role: string } };
}

export function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
