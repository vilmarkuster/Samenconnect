/**
 * Billing status helpers for Zorenta.
 * Used by API and UI to show plan/subscription state. No enforcement.
 */

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | null;

export interface BillingStatus {
  planSlug: string;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  isTestMode: boolean;
}

/** Normalize plan slug from profile (default to free). */
export function normalizePlanSlug(slug: string | null | undefined): string {
  if (!slug || typeof slug !== "string") return "free";
  const s = slug.toLowerCase();
  if (["free", "pro", "team", "featured"].includes(s)) return s;
  return "free";
}

/** Build billing status from profile row (e.g. from Supabase profiles select). */
export function getBillingStatus(profile: {
  plan_slug?: string | null;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
}): BillingStatus {
  return {
    planSlug: normalizePlanSlug(profile?.plan_slug),
    subscriptionStatus: (profile?.subscription_status as SubscriptionStatus) ?? null,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
    isTestMode: true, // Always true until we explicitly enable live mode
  };
}
