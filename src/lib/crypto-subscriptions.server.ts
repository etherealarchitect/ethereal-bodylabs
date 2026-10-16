/**
 * Server-only eligibility gate for Stripe stablecoin subscriptions.
 *
 * This deliberately fails closed. Stripe has described recurring stablecoin
 * subscriptions as a private-preview feature for approved US-based businesses.
 * Do not expose this value to client bundles or infer merchant eligibility
 * from the end user's IP address.
 */
export type CryptoSubscriptionGate =
  | { enabled: true }
  | {
      enabled: false;
      reason: "feature_disabled" | "merchant_country_unsupported" | "stripe_approval_missing";
    };

export function getCryptoSubscriptionGate(
  env: Record<string, string | undefined> = process.env,
): CryptoSubscriptionGate {
  if (env.STRIPE_CRYPTO_SUBSCRIPTIONS_ENABLED !== "true") {
    return { enabled: false, reason: "feature_disabled" };
  }

  // The Stripe subscription crypto feature described in current Stripe
  // guidance is limited to approved US-based merchants. Do not enable it for
  // Australian merchants unless Stripe changes the supported region and the
  // implementation is reviewed accordingly.
  if ((env.STRIPE_ACCOUNT_COUNTRY ?? "").trim().toUpperCase() !== "US") {
    return { enabled: false, reason: "merchant_country_unsupported" };
  }

  if (env.STRIPE_CRYPTO_SUBSCRIPTIONS_APPROVED !== "true") {
    return { enabled: false, reason: "stripe_approval_missing" };
  }

  return { enabled: true };
}
