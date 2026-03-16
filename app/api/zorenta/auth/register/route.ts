import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

const ROLES = ["caregiver", "client", "organization", "admin"] as const;

export async function POST(req: NextRequest) {
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
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : null;

    if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
      return new Response(
        JSON.stringify({ error: "Valid role is required: caregiver, client, organization, or admin." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Profile already exists for this user." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        role,
        display_name: displayName || null
      })
      .select("id, role, display_name, created_at")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ profile }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Registration failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
