import { describe, expect, it } from "vitest";
import { getCryptoSubscriptionGate } from "./crypto-subscriptions.server";

describe("getCryptoSubscriptionGate", () => {
  it("fails closed when the feature flag is missing", () => {
    expect(getCryptoSubscriptionGate({})).toEqual({
      enabled: false,
      reason: "feature_disabled",
    });
  });

  it("fails closed for an Australian merchant even when enabled and approved flags are set", () => {
    expect(
      getCryptoSubscriptionGate({
        STRIPE_CRYPTO_SUBSCRIPTIONS_ENABLED: "true",
        STRIPE_ACCOUNT_COUNTRY: "AU",
        STRIPE_CRYPTO_SUBSCRIPTIONS_APPROVED: "true",
      }),
    ).toEqual({ enabled: false, reason: "merchant_country_unsupported" });
  });

  it("requires explicit Stripe approval for a US merchant", () => {
    expect(
      getCryptoSubscriptionGate({
        STRIPE_CRYPTO_SUBSCRIPTIONS_ENABLED: "true",
        STRIPE_ACCOUNT_COUNTRY: "US",
      }),
    ).toEqual({ enabled: false, reason: "stripe_approval_missing" });
  });

  it("enables only when all explicit rollout conditions are met", () => {
    expect(
      getCryptoSubscriptionGate({
        STRIPE_CRYPTO_SUBSCRIPTIONS_ENABLED: "true",
        STRIPE_ACCOUNT_COUNTRY: "US",
        STRIPE_CRYPTO_SUBSCRIPTIONS_APPROVED: "true",
      }),
    ).toEqual({ enabled: true });
  });
});
