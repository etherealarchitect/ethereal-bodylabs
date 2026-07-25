import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, Clock, Loader2, RefreshCw, ArrowRight, XCircle } from "lucide-react";
import { getCheckoutSessionStatus, syncSubscriptionFromSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/app/upgrade/return")({
  head: () => ({
    meta: [
      { title: "Checkout complete — Ethereal Bodylabs" },
      { name: "description", content: "Confirmation of your Ethereal Bodylabs Premium subscription." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: UpgradeReturn,
});

function fmtMoney(cents: number | null, currency: string | null): string {
  if (cents == null || !currency) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function UpgradeReturn() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const syncedRef = useRef(false);

  const query = useQuery({
    queryKey: ["checkout-return", session_id],
    enabled: !!session_id,
    queryFn: async () => {
      const res = await getCheckoutSessionStatus({ data: { sessionId: session_id!, environment: getStripeEnvironment() } });
      return res;
    },
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d || !("ok" in d) || !d.ok) return false;
      if (d.status === "open") return 2500;
      if (d.paymentStatus === "unpaid" && d.mode !== "subscription") return 2500;
      return false;
    },
  });

  // Reconcile entitlement server-side once payment is complete — safety net
  // in case the Stripe webhook is delayed or dropped.
  useEffect(() => {
    if (syncedRef.current || !session_id) return;
    const d = query.data;
    if (!d || !("ok" in d) || !d.ok) return;
    if (d.status !== "complete") return;
    syncedRef.current = true;
    (async () => {
      try {
        await syncSubscriptionFromSession({ data: { sessionId: session_id, environment: getStripeEnvironment() } });
      } catch (e) {
        console.warn("subscription sync failed", e);
      } finally {
        qc.invalidateQueries({ queryKey: ["subscription"] });
      }
    })();
  }, [query.data, session_id, qc]);


  if (!session_id) return <MissingSession />;
  if (query.isLoading) return <StateShell><Loading /></StateShell>;
  if (query.error) return <StateShell><ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} /></StateShell>;
  const d = query.data;
  if (!d) return <StateShell><Loading /></StateShell>;
  if (!d.ok) return <StateShell><ErrorState message={d.error} onRetry={() => query.refetch()} /></StateShell>;

  // Route by outcome ------------------------------------------------------
  if (d.status === "expired") {
    return <StateShell><ExpiredState /></StateShell>;
  }

  if (d.status === "open") {
    return (
      <StateShell>
        <PendingState onRetry={() => query.refetch()} />
      </StateShell>
    );
  }

  // status === "complete"
  const isSubscription = d.mode === "subscription";
  const inTrial = !!d.trialEnd && new Date(d.trialEnd).getTime() > Date.now();
  const paidNow = d.paymentStatus === "paid";
  const trialBillDate = inTrial ? d.trialEnd : d.currentPeriodEnd;
  const priceLabel = d.amountTotal
    ? `${fmtMoney(d.amountTotal, d.currency)}${isSubscription && d.interval ? ` / ${d.interval}` : ""}`
    : d.interval
      ? `Billed ${d.interval}ly`
      : null;

  return (
    <StateShell>
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          {inTrial ? "Your free trial is live" : paidNow ? "You're on Premium" : "You're all set"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {inTrial
            ? `We've saved your card. Full access unlocked — you won't be charged until ${fmtDate(trialBillDate)}.`
            : paidNow
              ? "Payment received. Every Premium feature is unlocked in your account."
              : "Your subscription is being finalised. We'll email a receipt once payment settles."}
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4 mb-4">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono mb-2">Order summary</div>
        <div className="space-y-1.5 text-sm">
          <Row label="Plan" value={d.planName ?? "Premium"} />
          {priceLabel && <Row label="Price" value={priceLabel} />}
          {inTrial && <Row label="Trial ends" value={fmtDate(d.trialEnd)} />}
          {!inTrial && d.currentPeriodEnd && <Row label={isSubscription ? "Next billing date" : "Access through"} value={fmtDate(d.currentPeriodEnd)} />}
          {d.customerEmail && <Row label="Receipt to" value={d.customerEmail} />}
          {d.cancelAtPeriodEnd && (
            <div className="mt-2 rounded-lg bg-amber-100 text-amber-900 text-xs px-2.5 py-1.5">
              Set to cancel at the end of the current period.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4 mb-6">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono mb-2">What's next</div>
        <ol className="space-y-1.5 text-sm">
          <NextStep n={1} text="Complete onboarding so your training and macro targets calibrate." />
          <NextStep n={2} text="Snap a start photo in Physique — your baseline unlocks collages later." />
          <NextStep n={3} text="Ask Alice (bottom-right) for anything — meals, form, protocol." />
          {inTrial && <NextStep n={4} text={`Cancel anytime before ${fmtDate(trialBillDate)} from Settings → Billing to avoid the charge.`} />}
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => { qc.invalidateQueries({ queryKey: ["subscription"] }); navigate({ to: "/app" }); }}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5"
        >
          Enter the app <ArrowRight className="size-4" />
        </button>
        <Link to="/app/billing" className="flex-1 h-11 rounded-xl border border-border/60 bg-background text-sm font-medium inline-flex items-center justify-center">
          View billing
        </Link>
      </div>

      {session_id && (
        <div className="mt-6 text-[10px] font-mono text-muted-foreground/60 text-center">ref: {session_id.slice(0, 28)}…</div>
      )}
    </StateShell>
  );
}

/* ---------------- states ---------------- */

function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 py-10 sm:py-14">{children}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="text-center py-16">
      <Loader2 className="size-8 animate-spin text-primary mx-auto mb-3" />
      <div className="text-sm text-muted-foreground">Confirming your checkout…</div>
    </div>
  );
}

function PendingState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center size-14 rounded-full bg-amber-100 text-amber-700 mb-4">
        <Clock className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold mb-1">Almost there</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Your payment is still processing. This usually clears in a few seconds — some banks (or 3D Secure) can take a minute.
        We're checking with Stripe automatically.
      </p>
      <div className="rounded-2xl border border-border/60 bg-surface-2 p-4 mb-6 text-left text-sm">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono mb-2">What you can do</div>
        <ul className="space-y-1.5">
          <li>• Keep this page open — we'll refresh as soon as the payment lands.</li>
          <li>• If a bank prompt is waiting elsewhere, complete it and return here.</li>
          <li>• If nothing happens after a minute, try again with a different card.</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onRetry} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2">
          <RefreshCw className="size-4" /> Check again
        </button>
        <Link to="/app/upgrade" className="flex-1 h-11 rounded-xl border border-border/60 bg-background text-sm font-medium inline-flex items-center justify-center">
          Try a different card
        </Link>
      </div>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center size-14 rounded-full bg-muted text-muted-foreground mb-4">
        <XCircle className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold mb-1">Checkout expired</h1>
      <p className="text-muted-foreground text-sm mb-6">
        The session ended before payment was completed. No charge was made — you can start again in a couple of taps.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link to="/app/upgrade" className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center">
          Restart checkout
        </Link>
        <Link to="/pricing" className="flex-1 h-11 rounded-xl border border-border/60 bg-background text-sm font-medium inline-flex items-center justify-center">
          Compare plans
        </Link>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center size-14 rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold mb-1">We couldn't confirm your payment</h1>
      <p className="text-muted-foreground text-sm mb-6">{message}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onRetry} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Retry</button>
        <Link to="/app/billing" className="flex-1 h-11 rounded-xl border border-border/60 bg-background text-sm font-medium inline-flex items-center justify-center">
          Check billing status
        </Link>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground/80">
        If your card was charged, it will still be honoured once Stripe finalises — usually within a minute.
      </p>
    </div>
  );
}

function MissingSession() {
  return (
    <StateShell>
      <div className="text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-muted text-muted-foreground mb-4">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold mb-1">No checkout to confirm</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We didn't find a Stripe session in the URL. Head back to your upgrade page to start again.
        </p>
        <Link to="/app/upgrade" className="inline-flex h-11 items-center px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Back to upgrade
        </Link>
      </div>
    </StateShell>
  );
}

/* ---------------- bits ---------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}
function NextStep({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold">{n}</span>
      <span>{text}</span>
    </li>
  );
}
