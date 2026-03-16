import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

async function getProfileId(supabase: ReturnType<typeof getZorentaSupabaseClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const { data, error } = await supabase
      .from("organization_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (error && error.code !== "PGRST116") {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ profile: data ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return new Response(JSON.stringify({ error: "Organization name is required." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const payload = {
      profile_id: profileId,
      name,
      org_type: typeof body.org_type === "string" ? body.org_type.trim() || null : null,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      region: typeof body.region === "string" ? body.region.trim() || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null
    };

    const { data, error } = await supabase.from("organization_profiles").insert(payload).select().single();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(data), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const supabase = getZorentaSupabaseClient(token);
    const profileId = await getProfileId(supabase);
    if (!profileId) {
      return new Response(JSON.stringify({ error: "Profile not found." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string") payload.name = body.name.trim();
    if (typeof body.org_type === "string") payload.org_type = body.org_type.trim() || null;
    if (typeof body.description === "string") payload.description = body.description.trim() || null;
    if (typeof body.city === "string") payload.city = body.city.trim() || null;
    if (typeof body.region === "string") payload.region = body.region.trim() || null;
    if (typeof body.country === "string") payload.country = body.country.trim() || null;

    const { data, error } = await supabase
      .from("organization_profiles")
      .update(payload)
      .eq("profile_id", profileId)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
