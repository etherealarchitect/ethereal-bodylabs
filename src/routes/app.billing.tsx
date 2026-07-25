import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Download, ExternalLink, Sparkles, Receipt, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, PauseCircle, PlayCircle, RefreshCw, Zap, X, ArrowUpRight, ArrowDownRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { cancelSubscription, changePlan, createPortalSession, getBillingData, getSubscriptionEvents, previewPlanChange, PLAN_CATALOG, reactivateSubscription, type PlanOption, type PreviewPlanChangeResult, type SubscriptionEvent } from "@/utils/payments.functions";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";


export const Route = createFileRoute("/app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Subscription — Ethereal Bodylabs" },
      { name: "description", content: "Manage your Premium subscription, payment method, and view past invoices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function fmtMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function statusBadge(status: string | null) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    open: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    void: "bg-muted text-muted-foreground",
    uncollectible: "bg-red-500/10 text-red-700 dark:text-red-400",
    draft: "bg-muted text-muted-foreground",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
}

function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, isActive, isTrialing, trialDaysLeft, tier } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [planTarget, setPlanTarget] = useState<PlanOption | null>(null);
  const [preview, setPreview] = useState<Extract<PreviewPlanChangeResult, { newPriceId: string }> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);


  const env = isPaymentsConfigured() ? getStripeEnvironment() : "sandbox";
  const billing = useQuery({
    queryKey: ["billing-data", user?.id, env],
    enabled: !!user && !!subscription,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await getBillingData({ data: { environment: env } });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
  });

  const events = useQuery({
    queryKey: ["billing-events", user?.id, env],
    enabled: !!user && !!subscription,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await getSubscriptionEvents({ data: { environment: env } });
      if ("error" in res) throw new Error(res.error);
      return res.events;
    },
  });


  if (authLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <div className="p-8 text-sm">Please sign in.</div>;

  const openPortal = async (action?: "payment_method") => {
    setPortalLoading(true);
    try {
      const res = await createPortalSession({
        data: { environment: env, returnUrl: `${window.location.origin}/app/billing` },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["subscription"] }),
        qc.invalidateQueries({ queryKey: ["billing-data"] }),
        qc.invalidateQueries({ queryKey: ["billing-events"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };


  const confirmCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await cancelSubscription({ data: { environment: env, immediate: false } });
      if ("error" in res) throw new Error(res.error);
      toast.success(
        res.current_period_end
          ? `Premium cancels on ${new Date(res.current_period_end).toLocaleDateString()}`
          : "Premium canceled",
      );
      setCancelOpen(false);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel subscription");
    } finally {
      setCancelLoading(false);
    }
  };

  const reactivate = async () => {
    setReactivateLoading(true);
    try {
      const res = await reactivateSubscription({ data: { environment: env } });
      if ("error" in res) throw new Error(res.error);
      toast.success("Subscription reactivated");
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reactivate");
    } finally {
      setReactivateLoading(false);
    }
  };

  const currentPriceId = subscription?.price_id ?? null;
  const currentPlan = PLAN_CATALOG.find((p) => p.priceId === currentPriceId) ?? null;

  const openPlanChange = async (target: PlanOption) => {
    setPlanTarget(target);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await previewPlanChange({ data: { environment: env, newPriceId: target.priceId } });
      if ("error" in res) throw new Error(res.error);
      setPreview(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not preview plan change");
      setPlanTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmPlanChange = async () => {
    if (!planTarget) return;
    setChanging(true);
    try {
      const res = await changePlan({ data: { environment: env, newPriceId: planTarget.priceId } });
      if ("error" in res) throw new Error(res.error);
      toast.success(`Switched to ${planTarget.label} plan`);
      setPlanTarget(null);
      setPreview(null);
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change plan");
    } finally {
      setChanging(false);
    }
  };


  const pm = billing.data && !("error" in billing.data) ? billing.data.paymentMethod : null;
  const invoices = billing.data && !("error" in billing.data) ? billing.data.invoices : [];

  const upcomingAmount = billing.data && !("error" in billing.data) ? billing.data.upcomingAmount : null;
  const upcomingDate = billing.data && !("error" in billing.data) ? billing.data.upcomingDate : null;
  const currency = billing.data && !("error" in billing.data) ? billing.data.currency : null;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-3xl mx-auto px-5 py-8 pb-24 space-y-6">
        <Link to="/app/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Settings
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing & Subscription</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your plan, payment method, and see past invoices.
            </p>
          </div>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            title="Refresh from Stripe"
            className="h-9 px-3 rounded-lg border border-border/60 bg-background text-xs font-medium disabled:opacity-60 inline-flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>


        {/* Plan card */}
        <section className="rounded-2xl border border-border/60 bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-1 mb-2">
                <Sparkles className="size-3" />
                {tier === "premium" ? (isTrialing ? "Trialing" : "Premium") : "Free"}
              </div>
              <div className="text-lg font-semibold">
                {tier === "premium" ? "Ethereal Bodylabs Premium" : "Free plan"}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {isTrialing
                  ? `Trial · ${trialDaysLeft ?? 0} day${(trialDaysLeft ?? 0) === 1 ? "" : "s"} left`
                  : isActive
                    ? subscription?.cancel_at_period_end
                      ? "Cancels at period end"
                      : "Active subscription"
                    : "Upgrade to unlock the full lab"}
              </div>
            </div>
            {tier === "premium" ? (
              <button
                onClick={() => openPortal()}
                disabled={portalLoading}
                className="h-10 px-4 rounded-lg border border-border/60 bg-background text-sm font-medium disabled:opacity-60 whitespace-nowrap"
              >
                {portalLoading ? "Opening…" : "Manage plan"}
              </button>
            ) : (
              <Link
                to="/app/upgrade"
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center whitespace-nowrap"
              >
                Upgrade
              </Link>
            )}
          </div>

          {isActive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3" /> {subscription?.cancel_at_period_end ? "Access until" : "Next billing date"}
                </div>
                <div className="text-sm font-medium mt-1">{fmtDate(upcomingDate ?? subscription?.current_period_end)}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="size-3" /> {subscription?.cancel_at_period_end ? "Amount due" : "Next charge"}
                </div>
                <div className="text-sm font-medium mt-1">
                  {subscription?.cancel_at_period_end ? fmtMoney(0, currency ?? "usd") : fmtMoney(upcomingAmount, currency)}
                </div>
              </div>
            </div>
          )}

          {isActive && subscription?.cancel_at_period_end && (
            <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-500/10 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-3">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Premium ends on {fmtDate(subscription.current_period_end)}</div>
                <div className="text-xs opacity-80 mt-0.5">
                  You'll keep full access until then. Reactivate any time before that date to continue.
                </div>
              </div>
              <button
                onClick={reactivate}
                disabled={reactivateLoading}
                className="h-8 px-3 rounded-md bg-amber-600 text-white text-xs font-medium disabled:opacity-60 whitespace-nowrap"
              >
                {reactivateLoading ? "…" : "Reactivate"}
              </button>
            </div>
          )}

          {isActive && !subscription?.cancel_at_period_end && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setCancelOpen(true)}
                className="text-xs text-muted-foreground hover:text-red-600 underline underline-offset-2"
              >
                Cancel Premium
              </button>
            </div>
          )}
        </section>

        {/* Change plan */}
        {isActive && !subscription?.cancel_at_period_end && (
          <section className="rounded-2xl border border-border/60 bg-surface-2 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw className="size-4" /> Change plan
              </h2>
              <span className="text-[11px] text-muted-foreground">Prorated automatically</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_CATALOG.map((p) => {
                const isCurrent = p.priceId === currentPriceId;
                const isUpgrade = currentPlan ? p.amount > currentPlan.amount : false;
                return (
                  <div
                    key={p.priceId}
                    className={`rounded-xl border p-4 flex flex-col gap-2 ${
                      isCurrent ? "border-primary/60 bg-primary/5" : "border-border/60 bg-background/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          {p.label}
                          {isCurrent && (
                            <span className="text-[10px] uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
                              Current
                            </span>
                          )}
                        </div>
                        {p.savingsLabel && !isCurrent && (
                          <div className="text-[11px] text-emerald-600 mt-0.5">{p.savingsLabel}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold">{fmtMoney(p.amount, p.currency)}</div>
                        <div className="text-[11px] text-muted-foreground">/ {p.interval}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => !isCurrent && openPlanChange(p)}
                      disabled={isCurrent}
                      className={`mt-1 h-9 px-3 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? "bg-muted text-muted-foreground cursor-default"
                          : isUpgrade
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "border border-border/60 bg-background hover:bg-muted"
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="size-3.5" /> Selected
                        </>
                      ) : isUpgrade ? (
                        <>
                          <ArrowUpRight className="size-3.5" /> Upgrade
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="size-3.5" /> Downgrade
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Upgrades charge the prorated difference immediately. Downgrades apply a credit to your next
              invoice. You keep Premium access without interruption.
            </p>
          </section>
        )}

        {/* Payment method */}

        {isActive && (
          <section className="rounded-2xl border border-border/60 bg-surface-2 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="size-4" /> Payment method
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {billing.isLoading ? (
                    "Loading…"
                  ) : pm ? (
                    <span className="capitalize">
                      {pm.brand ?? "Card"} •••• {pm.last4}{" "}
                      {pm.exp_month && pm.exp_year ? (
                        <span className="text-muted-foreground/70">
                          · exp {String(pm.exp_month).padStart(2, "0")}/{String(pm.exp_year).slice(-2)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    "No card on file"
                  )}
                </div>
              </div>
              <button
                onClick={() => openPortal("payment_method")}
                disabled={portalLoading}
                className="h-9 px-3 rounded-lg border border-border/60 bg-background text-sm font-medium disabled:opacity-60 whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <ExternalLink className="size-3.5" /> Update
              </button>
            </div>
          </section>
        )}

        {/* Invoices */}
        {isActive && (
          <section className="rounded-2xl border border-border/60 bg-surface-2 overflow-hidden">
            <div className="p-5 pb-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="size-4" /> Past payments
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Last 20 invoices</div>
            </div>
            <div className="divide-y divide-border/60">
              {billing.isLoading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading invoices…</div>
              ) : invoices.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No invoices yet.</div>
              ) : (
                invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {inv.description ?? "Subscription"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{fmtDate(inv.created)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ${statusBadge(inv.status)}`}>
                          {inv.status ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium tabular-nums">
                      {fmtMoney(inv.amount_paid, inv.currency)}
                    </div>
                    <div className="flex items-center gap-1">
                      {inv.hosted_invoice_url && (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                          title="View invoice"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      {inv.pdf_url && (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                          title="Download PDF"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Subscription event timeline */}
        {subscription && (
          <section className="rounded-2xl border border-border/60 bg-surface-2 overflow-hidden">
            <div className="p-5 pb-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4" /> Subscription timeline
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Trial, renewals, payments, and cancellations — pulled live from Stripe.
              </div>
            </div>
            <div>
              {events.isLoading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading timeline…</div>
              ) : events.error ? (
                <div className="p-5 text-sm text-red-700">
                  Couldn’t load timeline: {(events.error as Error).message}
                </div>
              ) : !events.data || events.data.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No events yet.</div>
              ) : (
                <ol className="relative border-l border-border/60 ml-6 mr-5 mb-5">
                  {events.data.map((ev) => (
                    <TimelineItem key={ev.id} event={ev} />
                  ))}
                </ol>
              )}
            </div>
          </section>
        )}



        {billing.error && (
          <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 text-sm p-4">
            Couldn’t load billing data: {(billing.error as Error).message}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80">
          Billing is processed securely by Stripe. Full invoice history, tax IDs, and cancellation options are
          available in the Stripe billing portal.
        </p>
      </div>

      {planTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !changing && !previewLoading && setPlanTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-background border border-border/60 shadow-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="size-5" />
                </div>
                <h2 className="text-base font-semibold">
                  Switch to {planTarget.label} · {fmtMoney(planTarget.amount, planTarget.currency)}/{planTarget.interval}
                </h2>
              </div>
              <button
                onClick={() => setPlanTarget(null)}
                disabled={changing || previewLoading}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {previewLoading || !preview ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Calculating proration…</div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-border/60 bg-surface-2 p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due today</span>
                    <span className="font-semibold">
                      {preview.immediateTotal >= 0
                        ? fmtMoney(preview.immediateTotal, preview.currency)
                        : `${fmtMoney(Math.abs(preview.immediateTotal), preview.currency)} credit`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next invoice</span>
                    <span className="font-medium">{fmtMoney(preview.nextInvoiceTotal, preview.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next billing date</span>
                    <span className="font-medium">{fmtDate(preview.nextInvoiceDate)}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {preview.immediateTotal > 0.001
                    ? `You'll be charged the prorated difference of ${fmtMoney(preview.immediateTotal, preview.currency)} today for the remainder of your current period, then ${fmtMoney(preview.nextInvoiceTotal, preview.currency)} on ${fmtDate(preview.nextInvoiceDate)}.`
                    : preview.immediateTotal < -0.001
                      ? `You'll receive a ${fmtMoney(Math.abs(preview.immediateTotal), preview.currency)} credit applied to your next invoice on ${fmtDate(preview.nextInvoiceDate)}.`
                      : `No charge today. Your next invoice on ${fmtDate(preview.nextInvoiceDate)} will be ${fmtMoney(preview.nextInvoiceTotal, preview.currency)}.`}
                </div>

                {preview.lines.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View line items ({preview.lines.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {preview.lines.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                          <span className="text-muted-foreground truncate">{l.description}</span>
                          <span className="tabular-nums shrink-0">{fmtMoney(l.amount, preview.currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                onClick={() => setPlanTarget(null)}
                disabled={changing || previewLoading}
                className="h-10 px-4 rounded-lg border border-border/60 bg-background text-sm font-medium disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={changing || previewLoading || !preview}
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {changing ? "Switching…" : "Confirm switch"}
              </button>
            </div>
          </div>
        </div>
      )}



      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !cancelLoading && setCancelOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-background border border-border/60 shadow-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center">
                  <XCircle className="size-5" />
                </div>
                <h2 id="cancel-title" className="text-base font-semibold">Cancel Premium?</h2>
              </div>
              <button
                onClick={() => setCancelOpen(false)}
                disabled={cancelLoading}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Your subscription will remain active until{" "}
                <span className="font-medium text-foreground">
                  {fmtDate(upcomingDate ?? subscription?.current_period_end)}
                </span>
                . After that you'll lose access to Premium features and no further charges will be made.
              </p>
              <p className="text-xs">You can reactivate any time before that date.</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
              <button
                onClick={() => setCancelOpen(false)}
                disabled={cancelLoading}
                className="h-10 px-4 rounded-lg border border-border/60 bg-background text-sm font-medium disabled:opacity-60"
              >
                Keep Premium
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {cancelLoading ? "Canceling…" : "Cancel Premium"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function categoryStyle(cat: SubscriptionEvent["category"]) {
  switch (cat) {
    case "trial": return { icon: Sparkles, color: "text-violet-600 bg-violet-500/10 ring-violet-500/20" };
    case "renewal": return { icon: RefreshCw, color: "text-emerald-600 bg-emerald-500/10 ring-emerald-500/20" };
    case "payment": return { icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10 ring-amber-500/20" };
    case "cancellation": return { icon: XCircle, color: "text-red-600 bg-red-500/10 ring-red-500/20" };
    case "pause": return { icon: PauseCircle, color: "text-slate-600 bg-slate-500/10 ring-slate-500/20" };
    case "update": return { icon: Zap, color: "text-blue-600 bg-blue-500/10 ring-blue-500/20" };
    case "created": return { icon: PlayCircle, color: "text-emerald-600 bg-emerald-500/10 ring-emerald-500/20" };
    default: return { icon: CheckCircle2, color: "text-muted-foreground bg-muted ring-border/60" };
  }
}

function fmtEventDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtEventMoney(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return null;
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency.toUpperCase()}`; }
}

function TimelineItem({ event }: { event: SubscriptionEvent }) {
  const { icon: Icon, color } = categoryStyle(event.category);
  const money = fmtEventMoney(event.amount, event.currency);
  return (
    <li className="ml-6 py-4 first:pt-5 last:pb-5 border-b border-border/40 last:border-b-0">
      <span className={`absolute -left-[13px] flex size-6 items-center justify-center rounded-full ring-4 ring-background ${color}`}>
        <Icon className="size-3.5" />
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium capitalize">{event.title}</div>
          {event.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{event.description}</div>
          )}
          <div className="text-[11px] text-muted-foreground/80 mt-1">{fmtEventDate(event.created)}</div>
        </div>
        {money && <div className="text-sm font-medium tabular-nums whitespace-nowrap">{money}</div>}
      </div>
    </li>
  );
}
