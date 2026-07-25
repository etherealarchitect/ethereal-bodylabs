import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isPaymentsConfigured } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Sparkles, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { parsePlanInput } from "@/lib/plan-intent";

type PlanId = "premium_monthly" | "premium_yearly";

export const Route = createFileRoute("/app/upgrade")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Upgrade to Premium — Ethereal Bodylabs" },
      { name: "description", content: "Start your 30-day free trial of Premium. $12.99/month or $129.99/year after, cancel anytime." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { plan?: PlanId; planInvalid?: true } => {
    const { plan, planInvalid } = parsePlanInput(search.plan);
    if (plan === "premium_monthly" || plan === "premium_yearly") return { plan };
    if (plan === "free" || planInvalid) return { planInvalid: true };
    return {};
  },
  component: UpgradePage,
});

const TRIAL_DAYS = 30;

function UpgradePage() {
  const { plan, planInvalid } = Route.useSearch();
  const priceId: PlanId = plan ?? "premium_monthly";
  const priceLabel = priceId === "premium_yearly" ? "$129.99/year" : "$12.99/month";
  const { user, loading } = useAuth();
  const { subscription, isActive, isTrialing, trialDaysLeft } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);


  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <div className="p-8 text-sm">Please sign in.</div>;

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await createPortalSession({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/app/upgrade` },
      });
      if ("error" in res) throw new Error(res.error);
      window.open(res.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-2xl mx-auto px-5 py-8">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="size-4" /> Back
        </Link>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-3">
          <Sparkles className="size-3.5" /> Premium
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Unlock the full lab</h1>
        <p className="text-muted-foreground text-sm mb-6">
          AI Coach, bloodwork analysis, unlimited programs, weekly reports & collages —
          all for <span className="text-foreground font-medium">{priceLabel}</span> after a 30-day free trial.
        </p>

        {planInvalid && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">We didn't recognise that plan</div>
              <div className="mt-0.5 text-xs">
                Showing our Monthly plan as a fallback. <Link to="/pricing" className="underline underline-offset-2">Compare plans</Link>.
              </div>
            </div>
          </div>
        )}



        {isActive ? (
          <div className="rounded-2xl border border-border/60 bg-surface-2 p-6">
            <div className="text-sm font-medium mb-1">
              {isTrialing
                ? `You're on the Premium trial — ${trialDaysLeft ?? 0} day${(trialDaysLeft ?? 0) === 1 ? "" : "s"} left`
                : "You're on Premium"}
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              {subscription?.cancel_at_period_end
                ? "Cancels at end of current period."
                : subscription?.current_period_end
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                  : ""}
            </div>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="h-10 px-4 rounded-lg border border-border/60 bg-background text-sm font-medium disabled:opacity-60"
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </button>
          </div>
        ) : !isPaymentsConfigured() ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
            Premium checkout is not yet configured for this environment.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-surface-2 p-2">
            <StripeEmbeddedCheckout priceId={priceId} trialDays={TRIAL_DAYS} />
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/80 mt-4">
          Trial requires a payment method. You'll be billed {priceLabel} on day 30 unless you cancel.
          Manage or cancel anytime from Settings → Billing.
        </p>
      </div>
    </div>
  );
}
