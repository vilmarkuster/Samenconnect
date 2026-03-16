import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = getZorentaSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return new Response(
          JSON.stringify({ profile: null, email: user.email }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const out: { profile: typeof profile; caregiver?: unknown; client?: unknown; organization?: unknown; authUserId: string } = {
      profile,
      authUserId: user.id,
    };
    if (profile.role === "caregiver") {
      const { data: cp } = await supabase.from("caregiver_profiles").select("*").eq("profile_id", profile.id).single();
      out.caregiver = cp ?? null;
    } else if (profile.role === "client") {
      const { data: cp } = await supabase.from("client_profiles").select("*").eq("profile_id", profile.id).single();
      out.client = cp ?? null;
    } else if (profile.role === "organization") {
      const { data: op } = await supabase.from("organization_profiles").select("*").eq("profile_id", profile.id).single();
      out.organization = op ?? null;
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = getZorentaSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const updates: { display_name?: string; avatar_url?: string } = {};
    if (typeof body.display_name === "string") updates.display_name = body.display_name.trim() || null;
    if (typeof body.avatar_url === "string") updates.avatar_url = body.avatar_url.trim() || null;

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ profile }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Update failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
