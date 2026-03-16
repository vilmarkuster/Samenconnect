/**
 * Placeholder: create Stripe Checkout Session for subscription/plan upgrade.
 * Not wired to live payments. Test mode only.
 */

import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { getStripeSecretKey, billingEnabled } from "@/lib/zorenta/billing-config";

export async function POST(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header (Bearer token)." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!billingEnabled) {
      return new Response(
        JSON.stringify({
          error: "Billing is not configured or not in test mode.",
          code: "BILLING_DISABLED",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
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

    const body = await req.json().catch(() => ({}));
    const planSlug = typeof body.plan_slug === "string" ? body.plan_slug.trim() : null;
    if (!planSlug) {
      return new Response(
        JSON.stringify({ error: "plan_slug is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Placeholder: in a full implementation we would create a Stripe Customer (if needed),
    // create a Checkout Session with mode: 'subscription' and the price ID for the plan,
    // and return { url: session.url }. For now return a placeholder so UI can call this.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    return new Response(
      JSON.stringify({
        url: `${baseUrl}/zorenta/settings/plans?checkout=placeholder`,
        message: "Checkout not yet enabled. Configure Stripe test keys and add price IDs to enable.",
        testMode: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Checkout session failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
