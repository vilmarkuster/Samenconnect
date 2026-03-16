/**
 * Admin-only: get billing-related data for a user.
 * For future admin panel. Requires profile.role === 'admin'.
 */

import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = getZorentaSupabaseClient(token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden. Admin only." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const targetId = params?.id;
    if (!targetId) {
      return new Response(
        JSON.stringify({ error: "User id required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, display_name, role, plan_slug, subscription_status, stripe_customer_id, stripe_subscription_id"
      )
      .eq("id", targetId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let featuredProfileUntil: string | null = null;
    if (profile.role === "caregiver") {
      const { data: cp } = await supabase
        .from("caregiver_profiles")
        .select("featured_until")
        .eq("profile_id", targetId)
        .single();
      featuredProfileUntil = cp?.featured_until ?? null;
    }

    return new Response(
      JSON.stringify({
        userId: profile.id,
        displayName: profile.display_name,
        role: profile.role,
        planSlug: profile.plan_slug ?? "free",
        subscriptionStatus: profile.subscription_status ?? null,
        stripeCustomerId: profile.stripe_customer_id ?? null,
        stripeSubscriptionId: profile.stripe_subscription_id ?? null,
        featuredProfileUntil,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Request failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
