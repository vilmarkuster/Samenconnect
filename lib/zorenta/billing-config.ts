/**
 * Zorenta billing configuration – test/sandbox only.
 * No production secrets. Stripe keys must be set in env for billing features to be available.
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? "";
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** True if Stripe is configured (any key set). Always use test keys in development. */
export const isStripeConfigured = Boolean(
  stripeSecretKey && stripePublishableKey
);

/** Force test mode: only allow Stripe operations when using test keys (sk_test_ / pk_test_). */
export function isStripeTestMode(): boolean {
  const secretIsTest = stripeSecretKey.startsWith("sk_test_");
  const publishableIsTest = stripePublishableKey.startsWith("pk_test_");
  if (stripeSecretKey && stripePublishableKey) {
    return secretIsTest && publishableIsTest;
  }
  return true; // not configured = treat as test
}

/** Get Stripe secret key. Returns empty string if not set or not in test mode. */
export function getStripeSecretKey(): string {
  if (!isStripeTestMode()) return "";
  return stripeSecretKey;
}

/** Get Stripe publishable key for client. */
export function getStripePublishableKey(): string {
  if (!isStripeTestMode()) return "";
  return stripePublishableKey;
}

/** Webhook secret for Stripe webhooks (optional; use for future webhook handler). */
export function getStripeWebhookSecret(): string {
  return stripeWebhookSecret;
}

/** Billing is enabled only when Stripe is configured and in test mode. No live payments. */
export const billingEnabled = isStripeConfigured && isStripeTestMode();
