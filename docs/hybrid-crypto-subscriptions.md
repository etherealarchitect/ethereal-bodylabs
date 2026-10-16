# Hybrid crypto subscriptions — implementation and release gate

## Current architecture

Ethereal Bodylabs already uses Stripe Checkout in subscription mode and Stripe Billing for subscription lifecycle management. Its billing page and payment server functions are in:

- `src/routes/app.billing.tsx`
- `src/utils/payments.functions.ts`
- `src/lib/stripe.server.ts`

The existing server code reads credentials from environment variables (`STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY`, `LOVABLE_API_KEY`) and verifies Stripe webhook signatures with `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET`. Keep all credentials server-side; never expose them in Vite/client variables or source control.

## Important product distinction

- **Crypto subscription payments**: a customer pays Ethereal Bodylabs for its subscription in crypto/stablecoin; the payment provider confirms the payment and Stripe Billing / the entitlement system records access.
- **Stripe Crypto Onramp**: a customer buys crypto for their own wallet. It does not pay Ethereal Bodylabs and must not grant subscription access by itself.

Do not use an Onramp session's `fulfillment_complete` event as proof that a subscription invoice was paid.

## Regional eligibility gate

Stripe announced recurring stablecoin subscription payments in private preview for **US-based businesses**, initially supporting USDC on Base and Polygon. Stripe's public guidance says businesses must request access and be approved. An Australian Stripe account must not assume this feature is available.

Before enabling the payment method:
1. Confirm the legal Stripe account country for the merchant that will receive subscription proceeds.
2. In Stripe Dashboard, request Stablecoin/Crypto payment method access and request subscription support where offered.
3. Obtain written confirmation from Stripe that this exact account, business model, customer geography and subscription use case are approved.
4. If the merchant account is Australian or otherwise ineligible, keep crypto subscription checkout disabled. Choose an approved third-party crypto recurring-payment provider only after reviewing its supported countries, recurring-payment mechanics, fees, refunds, webhook signatures, and legal/compliance obligations.

The app must fail closed: no payment UI, no checkout session and no entitlement when the provider feature is unapproved or unconfigured.

## Hybrid checkout design

1. Keep existing Stripe card and wallet checkout as the default path.
2. Add a separate “Pay with stablecoin” choice only when the server-side feature gate says the merchant account has been approved and configured.
3. Use Stripe Checkout / Stripe Billing's supported stablecoin subscription flow when enabled by Stripe. Prefer Dashboard-managed payment-method configuration if that is the supported setup for the account; do not invent a `payment_method_types` value or manually collect wallet credentials.
4. Preserve the current subscription price lookup and authenticated user binding. Never accept an arbitrary amount or price from the client; allow only configured recurring Price IDs.
5. Associate the Stripe customer, Checkout Session, subscription, and internal user through trusted server-side metadata.
6. Treat the return URL as UX only. It must never grant Premium access by itself.

## Verified payment and entitlement rules

- Verify the raw-body `Stripe-Signature` using the correct environment-specific webhook secret, enforce timestamp tolerance, and reject invalid signatures.
- Make event handling idempotent using the Stripe event ID and a unique database constraint / processed-event record.
- Grant or renew access only after a trusted Stripe event or server-side retrieval confirms the invoice/payment is paid and the associated subscription is eligible.
- Handle subscription lifecycle events such as `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and checkout completion as appropriate to the existing implementation. Never grant access from an unverified client callback.
- On failed, unpaid, canceled, expired, or disputed/reversed payments, apply the configured grace-period and entitlement policy. Do not silently leave access active forever.
- Record provider, payment method family, external customer/subscription/invoice IDs, payment state, event ID, and timestamps. Do not store private keys, wallet seed phrases, full card data, or unnecessary personal information.
- Reconcile entitlements against Stripe periodically to repair missed or out-of-order webhooks.

## Required secrets and configuration

Use the existing Stripe secret variables and webhook secrets. Add a server-only feature flag such as `STRIPE_CRYPTO_SUBSCRIPTIONS_ENABLED=false` by default, and only allow it to be enabled after the account is approved and the configured Stripe environment supports the feature. If a separate provider is selected for Australian recurring crypto, use provider-specific server-only credentials and webhook signing secret; do not reuse Stripe Onramp credentials for that purpose.

Never use a `VITE_*` prefix for secret values. Configure separate sandbox and live values in the hosting provider's encrypted environment settings. Do not put any secrets in GitHub.

## Release acceptance checklist

- [ ] Stripe confirms merchant-country and subscription eligibility in writing.
- [ ] Sandbox checkout shows card/wallet and, where approved, the stablecoin option.
- [ ] The subscription stays inactive when checkout is merely opened or the return page is visited.
- [ ] Valid signed successful payment event activates the correct user's plan.
- [ ] Invalid signature, stale timestamp, duplicate event and mismatched user/customer do not activate access.
- [ ] Failed payment, cancellation, renewal, refund/reversal policy and grace period are tested.
- [ ] Users cannot change price IDs, user IDs, customer IDs, or subscription IDs to gain another plan.
- [ ] Mobile web, iOS WebView, keyboard/accessibility, error and retry flows pass.
- [ ] Production secrets are installed in hosting settings and production webhook endpoint is verified.
- [ ] A live payment and subsequent entitlement update are verified before claiming release completion.

## Current status

This document records the required implementation and safety gates. It does not claim crypto subscriptions are enabled, that Stripe has approved the merchant, or that a production deployment has occurred. The current repository uses a Lovable Stripe gateway and must be tested in its actual hosting environment before any live release.
