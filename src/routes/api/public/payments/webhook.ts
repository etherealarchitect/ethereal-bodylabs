import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function iso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function resolvePriceId(item: any): string | null {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id || null;
}

async function resolveUserId(sub: any, env: StripeEnv): Promise<string | null> {
  if (sub?.metadata?.userId) return sub.metadata.userId;
  // Fall back to the customer's metadata (set by resolveOrCreateCustomer).
  const customerId = typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id;
  if (!customerId) return null;
  try {
    const stripe = createStripeClient(env);
    const cust = await stripe.customers.retrieve(customerId);
    if (!("deleted" in cust) && cust.metadata?.userId) return cust.metadata.userId;
  } catch (e) {
    console.error("resolveUserId: customer lookup failed", e);
  }
  return null;
}

async function upsertSubscription(sub: any, env: StripeEnv) {
  const userId = await resolveUserId(sub, env);
  if (!userId) {
    console.error("subscription webhook missing userId (metadata + customer)", sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;

  await (getSupabase().from("subscriptions") as any).upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      product_id: item?.price?.product ?? null,
      price_id: resolvePriceId(item),
      status: sub.status,
      trial_start: iso(sub.trial_start),
      trial_end: iso(sub.trial_end),
      current_period_start: iso(periodStart),
      current_period_end: iso(periodEnd),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function markCanceled(sub: any, env: StripeEnv) {
  await (getSupabase()
    .from("subscriptions") as any)
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id)
    .eq("environment", env);
}

async function updateStatusBySubId(subId: string, env: StripeEnv, patch: Record<string, any>) {
  if (!subId) return;
  await (getSupabase().from("subscriptions") as any)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId)
    .eq("environment", env);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Fetch the freshly-created subscription with items expanded so we can
  // grant entitlement immediately, even if customer.subscription.created
  // is delayed or arrives out of order.
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subId) return; // one-time payment; nothing to entitle here
  try {
    const stripe = createStripeClient(env);
    const sub = await stripe.subscriptions.retrieve(subId, {
      expand: ["items.data.price.product"],
    });
    // Ensure userId flows onto the subscription for future events.
    const userIdFromSession = session.metadata?.userId;
    if (userIdFromSession && !(sub as any).metadata?.userId) {
      try {
        await stripe.subscriptions.update(subId, {
          metadata: { ...((sub as any).metadata ?? {}), userId: userIdFromSession },
        });
        (sub as any).metadata = { ...((sub as any).metadata ?? {}), userId: userIdFromSession };
      } catch (e) {
        console.error("checkout.completed: failed to backfill sub metadata", e);
      }
    }
    await upsertSubscription(sub, env);
  } catch (e) {
    console.error("checkout.completed: sub retrieve failed", e);
  }
}

async function handle(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  const obj: any = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(obj, env);
      break;
    case "checkout.session.async_payment_failed":
      console.warn("checkout async payment failed", obj.id);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.trial_will_end":
    case "customer.subscription.resumed":
    case "customer.subscription.paused":
      await upsertSubscription(obj, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(obj, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      if (subId) {
        try {
          const stripe = createStripeClient(env);
          const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price.product"] });
          await upsertSubscription(sub, env);
        } catch (e) {
          console.error("invoice.paid: sub retrieve failed", e);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
      await updateStatusBySubId(subId, env, { status: "past_due" });
      break;
    }
    default:
      console.log("payments webhook: unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("payments webhook: invalid env", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handle(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("payments webhook error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
