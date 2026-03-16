/**
 * Placeholder: Stripe Customer Portal session (manage subscription, payment method).
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const stripeCustomerId = profile?.stripe_customer_id ?? null;
    const secretKey = getStripeSecretKey();

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Placeholder: if we had a Stripe Customer ID we would create a portal session
    // and return { url: session.url }. For now return a message.
    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({
          url: null,
          message: "Geen Stripe-klant gekoppeld. Upgrade eerst een plan om het portaal te gebruiken.",
          testMode: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        url: null,
        message: "Customer portal not yet enabled. Configure Stripe and create portal session in code.",
        testMode: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Portal session failed.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
