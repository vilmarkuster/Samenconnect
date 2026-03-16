/**
 * Returns current user's billing status (plan, subscription, test mode).
 * Does not require Stripe to be configured.
 */

import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { getBillingStatus } from "@/lib/zorenta/billing-status";
import { billingEnabled } from "@/lib/zorenta/billing-config";

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan_slug, subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const billing = getBillingStatus(profile ?? {});

    return new Response(
      JSON.stringify({
        ...billing,
        billingEnabled,
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
