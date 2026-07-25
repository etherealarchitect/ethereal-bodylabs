import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };
type PortalSessionResult = { url: string } | { error: string };

export type InvoiceRow = {
  id: string;
  status: string | null;
  amount_paid: number;
  currency: string;
  created: string | null;
  hosted_invoice_url: string | null;
  pdf_url: string | null;
  description: string | null;
};
export type PaymentMethodInfo = {
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
} | null;
export type BillingDataResult =
  | { invoices: InvoiceRow[]; paymentMethod: PaymentMethodInfo; upcomingAmount: number | null; upcomingDate: string | null; currency: string | null }
  | { error: string };

export type SubscriptionEvent = {
  id: string;
  type: string;
  created: string;
  title: string;
  description: string | null;
  category: "trial" | "renewal" | "payment" | "cancellation" | "pause" | "update" | "created" | "other";
  amount: number | null;
  currency: string | null;
};
export type SubscriptionEventsResult = { events: SubscriptionEvent[] } | { error: string };

export type CheckoutStatusResult =
  | {
      ok: true;
      status: "complete" | "open" | "expired";
      paymentStatus: "paid" | "unpaid" | "no_payment_required";
      mode: "subscription" | "payment" | "setup";
      amountTotal: number | null;
      currency: string | null;
      customerEmail: string | null;
      planName: string | null;
      interval: string | null;
      trialEnd: string | null;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      subscriptionStatus: string | null;
    }
  | { ok: false; error: string };

const ZERO_DECIMAL = new Set(["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"]);
const THREE_DECIMAL = new Set(["bhd","jod","kwd","omr","tnd"]);
function toMajor(amount: number | null | undefined, currency: string): number {
  const v = amount ?? 0;
  const c = (currency ?? "").toLowerCase();
  if (ZERO_DECIMAL.has(c)) return v;
  if (THREE_DECIMAL.has(c)) return v / 1000;
  return v / 100;
}
function iso(sec: number | null | undefined): string | null {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    returnUrl: string;
    environment: StripeEnv;
    trialDays?: number;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const { supabase, userId } = context;
      const { data: userRes } = await supabase.auth.getUser();
      const email = userRes.user?.email ?? undefined;

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      // Only offer a trial if the user has never started one before (guard
      // against repeat trials on re-subscribe).
      let allowTrial = false;
      if (isRecurring && data.trialDays && data.trialDays > 0) {
        const { data: prior } = await supabase
          .from("subscriptions")
          .select("id, trial_end")
          .eq("user_id", userId)
          .not("trial_end", "is", null)
          .limit(1);
        allowTrial = !prior || prior.length === 0;
      }

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId },
        ...(isRecurring && {
          subscription_data: {
            metadata: { userId },
            ...(allowTrial && { trial_period_days: data.trialDays }),
          },
        }),
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getCheckoutSessionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(d.sessionId)) throw new Error("Invalid session id");
    return d;
  })
  .handler(async ({ data }): Promise<CheckoutStatusResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription", "subscription.items.data.price.product", "line_items.data.price.product"],
      });

      let planName: string | null = null;
      let interval: string | null = null;
      let trialEnd: string | null = null;
      let currentPeriodEnd: string | null = null;
      let cancelAtPeriodEnd = false;
      let subscriptionStatus: string | null = null;

      const sub = typeof session.subscription === "object" ? session.subscription : null;
      if (sub) {
        subscriptionStatus = sub.status ?? null;
        trialEnd = iso(sub.trial_end);
        cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
        const item = sub.items?.data?.[0];
        currentPeriodEnd = iso(item?.current_period_end ?? (sub as any).current_period_end);
        interval = item?.price?.recurring?.interval ?? null;
        const prod = item?.price?.product;
        if (prod && typeof prod === "object" && "name" in prod) planName = (prod as any).name ?? null;
      }
      if (!planName) {
        const li = (session as any).line_items?.data?.[0];
        const prod = li?.price?.product;
        if (prod && typeof prod === "object" && "name" in prod) planName = prod.name ?? null;
      }

      return {
        ok: true,
        status: (session.status ?? "open") as any,
        paymentStatus: (session.payment_status ?? "unpaid") as any,
        mode: (session.mode ?? "subscription") as any,
        amountTotal: session.amount_total ?? null,
        currency: session.currency ?? null,
        customerEmail: session.customer_details?.email ?? null,
        planName,
        interval,
        trialEnd,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        subscriptionStatus,
      };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/**
 * Reconcile entitlement server-side from a Checkout Session id.
 *
 * Grants Premium immediately by upserting the `subscriptions` row using the
 * service role — a safety net for the return page in case the webhook is
 * delayed, retried, or dropped. Idempotent (upsert on stripe_subscription_id).
 */
export const syncSubscriptionFromSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(d.sessionId)) throw new Error("Invalid session id");
    return d;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; status: string | null; entitled: boolean } | { ok: false; error: string }> => {
    try {
      const { userId } = context;
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription", "subscription.items.data.price.product", "customer"],
      });

      // Confirm the session belongs to this signed-in user (via session or customer metadata).
      const sessionUserId = (session.metadata as any)?.userId ?? null;
      const customerUserId =
        typeof session.customer === "object" && session.customer && !("deleted" in session.customer)
          ? (session.customer.metadata as any)?.userId ?? null
          : null;
      const ownerUserId = sessionUserId ?? customerUserId;
      if (ownerUserId && ownerUserId !== userId) {
        return { ok: false, error: "Checkout session belongs to a different account" };
      }

      const sub = typeof session.subscription === "object" ? session.subscription : null;
      if (!sub) {
        // One-time payment or subscription not yet attached; nothing to entitle.
        return { ok: true, status: session.payment_status ?? null, entitled: false };
      }

      // Backfill userId onto the Subscription so future webhooks resolve cleanly.
      if (!(sub as any).metadata?.userId) {
        try {
          await stripe.subscriptions.update(sub.id, {
            metadata: { ...((sub as any).metadata ?? {}), userId },
          });
          (sub as any).metadata = { ...((sub as any).metadata ?? {}), userId };
        } catch {
          // non-fatal
        }
      }

      const item = sub.items?.data?.[0];
      const periodStart = item?.current_period_start ?? (sub as any).current_period_start;
      const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;
      const priceId =
        (item?.price as any)?.lookup_key
        || (item?.price as any)?.metadata?.lovable_external_id
        || item?.price?.id
        || null;
      const productId =
        typeof item?.price?.product === "string"
          ? item.price.product
          : (item?.price?.product as any)?.id ?? null;

      // Use the service-role client to bypass RLS for this reconcile write.
      // Loaded lazily so this file stays safe for the client bundle graph.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.from("subscriptions") as any).upsert(
        {
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id,
          product_id: productId,
          price_id: priceId,
          status: sub.status,
          trial_start: iso((sub as any).trial_start),
          trial_end: iso((sub as any).trial_end),
          current_period_start: iso(periodStart),
          current_period_end: iso(periodEnd),
          cancel_at_period_end: (sub as any).cancel_at_period_end ?? false,
          environment: data.environment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );

      const entitled =
        sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
      return { ok: true, status: sub.status ?? null, entitled };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalSessionResult> => {
    const { supabase, userId } = context;
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError || !sub?.stripe_customer_id) return { error: "No subscription found" };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        ...(data.returnUrl && { return_url: data.returnUrl }),
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const getBillingData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<BillingDataResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) {
      return { invoices: [], paymentMethod: null, upcomingAmount: null, upcomingDate: null, currency: null };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const customerId = sub.stripe_customer_id as string;

      const [invoicesRes, customer] = await Promise.all([
        stripe.invoices.list({ customer: customerId, limit: 20 }),
        stripe.customers.retrieve(customerId),
      ]);

      const invoices: InvoiceRow[] = invoicesRes.data.map((inv) => ({
        id: inv.id ?? "",
        status: inv.status ?? null,
        amount_paid: toMajor(inv.amount_paid, inv.currency),
        currency: inv.currency,
        created: iso(inv.created),
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        pdf_url: inv.invoice_pdf ?? null,
        description: inv.lines?.data?.[0]?.description ?? null,
      }));

      let paymentMethod: PaymentMethodInfo = null;
      let defaultPmId: string | null = null;
      if (!("deleted" in customer)) {
        const dpm = customer.invoice_settings?.default_payment_method;
        if (typeof dpm === "string") defaultPmId = dpm;
        else if (dpm && typeof dpm === "object" && "id" in dpm) defaultPmId = dpm.id;
      }
      if (defaultPmId) {
        try {
          const pm = await stripe.paymentMethods.retrieve(defaultPmId);
          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand ?? null,
              last4: pm.card.last4 ?? null,
              exp_month: pm.card.exp_month ?? null,
              exp_year: pm.card.exp_year ?? null,
            };
          }
        } catch {
          // ignore — fall back to listing
        }
      }
      if (!paymentMethod) {
        const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
        const pm = pms.data[0];
        if (pm?.card) {
          paymentMethod = {
            brand: pm.card.brand ?? null,
            last4: pm.card.last4 ?? null,
            exp_month: pm.card.exp_month ?? null,
            exp_year: pm.card.exp_year ?? null,
          };
        }
      }

      let upcomingAmount: number | null = null;
      let upcomingDate: string | null = null;
      let currency: string | null = invoices[0]?.currency ?? null;
      if (sub.stripe_subscription_id) {
        try {
          const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string);
          const item = s.items?.data?.[0];
          const periodEnd = item?.current_period_end ?? (s as any).current_period_end;
          upcomingDate = iso(periodEnd);
          const price = item?.price;
          if (price?.unit_amount != null && price.currency) {
            upcomingAmount = toMajor(price.unit_amount, price.currency);
            currency = price.currency;
          }
        } catch {
          // ignore
        }
      }

      return { invoices, paymentMethod, upcomingAmount, upcomingDate, currency };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

function describeEvent(event: any): { title: string; description: string | null; category: SubscriptionEvent["category"]; amount: number | null; currency: string | null } {
  const obj = event.data?.object ?? {};
  const prev = event.data?.previous_attributes ?? {};
  const cur = obj.currency ?? null;
  switch (event.type) {
    case "customer.subscription.created":
      return { title: obj.status === "trialing" ? "Trial started" : "Subscription created", description: obj.status === "trialing" && obj.trial_end ? `Trial ends ${new Date(obj.trial_end * 1000).toLocaleDateString()}` : null, category: obj.status === "trialing" ? "trial" : "created", amount: null, currency: cur };
    case "customer.subscription.trial_will_end":
      return { title: "Trial ending soon", description: obj.trial_end ? `Converts to paid on ${new Date(obj.trial_end * 1000).toLocaleDateString()}` : null, category: "trial", amount: null, currency: cur };
    case "customer.subscription.updated": {
      if (prev.cancel_at_period_end === false && obj.cancel_at_period_end === true) {
        return { title: "Cancellation scheduled", description: obj.current_period_end ? `Access until ${new Date(obj.current_period_end * 1000).toLocaleDateString()}` : null, category: "cancellation", amount: null, currency: cur };
      }
      if (prev.cancel_at_period_end === true && obj.cancel_at_period_end === false) {
        return { title: "Cancellation reversed", description: "Subscription will continue renewing", category: "update", amount: null, currency: cur };
      }
      if (prev.status && prev.status !== obj.status) {
        if (obj.status === "active" && prev.status === "trialing") {
          return { title: "Trial converted to paid", description: "Subscription is now active", category: "renewal", amount: null, currency: cur };
        }
        if (obj.status === "paused") return { title: "Subscription paused", description: null, category: "pause", amount: null, currency: cur };
        if (prev.status === "paused" && obj.status === "active") return { title: "Subscription resumed", description: null, category: "pause", amount: null, currency: cur };
        if (obj.status === "past_due") return { title: "Payment past due", description: "Stripe is retrying the charge", category: "payment", amount: null, currency: cur };
        return { title: `Status changed to ${obj.status}`, description: `From ${prev.status}`, category: "update", amount: null, currency: cur };
      }
      return { title: "Subscription updated", description: null, category: "update", amount: null, currency: cur };
    }
    case "customer.subscription.deleted":
      return { title: "Subscription canceled", description: null, category: "cancellation", amount: null, currency: cur };
    case "customer.subscription.paused":
      return { title: "Subscription paused", description: null, category: "pause", amount: null, currency: cur };
    case "customer.subscription.resumed":
      return { title: "Subscription resumed", description: null, category: "pause", amount: null, currency: cur };
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return { title: "Payment succeeded", description: obj.number ? `Invoice ${obj.number}` : null, category: "renewal", amount: toMajor(obj.amount_paid, obj.currency), currency: obj.currency };
    case "invoice.payment_failed":
      return { title: "Payment failed", description: obj.number ? `Invoice ${obj.number}` : null, category: "payment", amount: toMajor(obj.amount_due, obj.currency), currency: obj.currency };
    case "invoice.upcoming":
      return { title: "Upcoming invoice", description: obj.next_payment_attempt ? `Charges on ${new Date(obj.next_payment_attempt * 1000).toLocaleDateString()}` : null, category: "renewal", amount: toMajor(obj.amount_due, obj.currency), currency: obj.currency };
    case "invoice.finalized":
      return { title: "Invoice finalized", description: obj.number ?? null, category: "renewal", amount: toMajor(obj.amount_due, obj.currency), currency: obj.currency };
    case "customer.subscription.pending_update_applied":
      return { title: "Plan change applied", description: null, category: "update", amount: null, currency: cur };
    default:
      return { title: event.type.replace(/[._]/g, " "), description: null, category: "other", amount: null, currency: cur };
  }
}

export const getSubscriptionEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<SubscriptionEventsResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { events: [] };
    try {
      const stripe = createStripeClient(data.environment);
      const types = [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.trial_will_end",
        "customer.subscription.paused",
        "customer.subscription.resumed",
        "customer.subscription.pending_update_applied",
        "invoice.paid",
        "invoice.payment_succeeded",
        "invoice.payment_failed",
        "invoice.upcoming",
        "invoice.finalized",
      ];
      const results: SubscriptionEvent[] = [];
      // Stripe events API doesn't filter by customer directly, so we page and filter.
      const list = await stripe.events.list({ types, limit: 100 } as any);
      const customerId = sub.stripe_customer_id as string;
      for (const ev of list.data) {
        const obj: any = (ev as any).data?.object ?? {};
        const evCustomer = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
        if (evCustomer !== customerId) continue;
        const meta = describeEvent(ev);
        results.push({
          id: ev.id,
          type: ev.type,
          created: new Date(ev.created * 1000).toISOString(),
          ...meta,
        });
      }
      return { events: results };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });


export type CancelSubscriptionResult =
  | { status: string; cancel_at_period_end: boolean; current_period_end: string | null; canceled_immediately: boolean }
  | { error: string };

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; immediate?: boolean }) => data)
  .handler(async ({ data, context }): Promise<CancelSubscriptionResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) return { error: "No active subscription found" };
    try {
      const stripe = createStripeClient(data.environment);
      const subId = sub.stripe_subscription_id as string;
      const updated = data.immediate
        ? await stripe.subscriptions.cancel(subId)
        : await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
      const item = (updated as any).items?.data?.[0];
      const periodEnd = item?.current_period_end ?? (updated as any).current_period_end;
      return {
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end ?? false,
        current_period_end: iso(periodEnd),
        canceled_immediately: !!data.immediate,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const reactivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<CancelSubscriptionResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) return { error: "No subscription found" };
    try {
      const stripe = createStripeClient(data.environment);
      const updated = await stripe.subscriptions.update(
        sub.stripe_subscription_id as string,
        { cancel_at_period_end: false },
      );
      const item = (updated as any).items?.data?.[0];
      const periodEnd = item?.current_period_end ?? (updated as any).current_period_end;
      return {
        status: updated.status,
        cancel_at_period_end: updated.cancel_at_period_end ?? false,
        current_period_end: iso(periodEnd),
        canceled_immediately: false,
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ---------------- Plan catalog & change (upgrade/downgrade) ----------------

export type PlanOption = {
  priceId: string;                 // lookup_key we resolve server-side
  label: string;
  interval: "month" | "year";
  amount: number;                  // major unit
  currency: string;
  savingsLabel?: string;
};

export const PLAN_CATALOG: PlanOption[] = [
  { priceId: "premium_monthly", label: "Monthly", interval: "month", amount: 12.99, currency: "usd" },
  { priceId: "premium_yearly",  label: "Yearly",  interval: "year",  amount: 129.99, currency: "usd", savingsLabel: "Save ~17%" },
];

export type PreviewPlanChangeResult =
  | {
      currentPriceId: string | null;
      newPriceId: string;
      immediateTotal: number;      // major unit (may be negative for credit)
      currency: string;
      nextInvoiceTotal: number;    // major unit
      nextInvoiceDate: string | null;
      prorationDate: string;
      lines: Array<{ description: string; amount: number }>;
    }
  | { error: string };

export const previewPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; newPriceId: string }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.newPriceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<PreviewPlanChangeResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id, price_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) return { error: "No active subscription" };

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.newPriceId], limit: 1 });
      if (!prices.data.length) return { error: "New price not found" };
      const newPrice = prices.data[0];

      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string);
      const currentItem = current.items.data[0];
      if (currentItem.price.id === newPrice.id) {
        return { error: "You're already on this plan" };
      }

      const prorationDate = Math.floor(Date.now() / 1000);
      const upcoming: any = await (stripe.invoices as any).createPreview({
        customer: sub.stripe_customer_id as string,
        subscription: current.id,
        subscription_details: {
          items: [{ id: currentItem.id, price: newPrice.id }],
          proration_behavior: "create_prorations",
          proration_date: prorationDate,
        },
      });

      const currency = upcoming.currency ?? newPrice.currency;
      const prorationLines = (upcoming.lines?.data ?? []).filter((l: any) => l.proration);
      const immediate = prorationLines.reduce((s: number, l: any) => s + (l.amount ?? 0), 0);
      const nextPeriodEnd = (currentItem as any).current_period_end ?? (current as any).current_period_end;

      return {
        currentPriceId: (sub.price_id as string | null) ?? currentItem.price.lookup_key ?? null,
        newPriceId: data.newPriceId,
        immediateTotal: toMajor(immediate, currency),
        currency,
        nextInvoiceTotal: toMajor(newPrice.unit_amount ?? 0, currency),
        nextInvoiceDate: iso(nextPeriodEnd),
        prorationDate: new Date(prorationDate * 1000).toISOString(),
        lines: (upcoming.lines?.data ?? []).slice(0, 8).map((l: any) => ({
          description: l.description ?? "Line item",
          amount: toMajor(l.amount ?? 0, currency),
        })),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type ChangePlanResult =
  | { status: string; newPriceId: string; current_period_end: string | null }
  | { error: string };

export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; newPriceId: string }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.newPriceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<ChangePlanResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_subscription_id) return { error: "No active subscription" };

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.newPriceId], limit: 1 });
      if (!prices.data.length) return { error: "New price not found" };
      const newPrice = prices.data[0];

      const current = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string);
      const currentItem = current.items.data[0];
      if (currentItem.price.id === newPrice.id) return { error: "You're already on this plan" };

      const updated = await stripe.subscriptions.update(current.id, {
        items: [{ id: currentItem.id, price: newPrice.id }],
        proration_behavior: "create_prorations",
        cancel_at_period_end: false,
      });
      const item = updated.items.data[0];
      const periodEnd = (item as any).current_period_end ?? (updated as any).current_period_end;
      return {
        status: updated.status,
        newPriceId: data.newPriceId,
        current_period_end: iso(periodEnd),
      };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
