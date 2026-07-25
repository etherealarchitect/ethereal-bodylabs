import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, CreditCard, Apple, Link as LinkIcon } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

const DISMISS_KEY = "ebl:trial-interstitial:dismissed-at";
const REMIND_MS = 1000 * 60 * 60 * 24 * 3; // re-show every 3 days

export function TrialInterstitial() {
  const { user } = useAuth();
  const { tier, loading, subscription } = useSubscription();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || loading) return;
    if (tier === "premium") return;
    // Skip if the user previously started a trial (guard re-solicitation).
    if (subscription?.trial_end) return;
    if (typeof window === "undefined") return;
    const last = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    if (last && Date.now() - last < REMIND_MS) return;
    const t = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [user, loading, tier, subscription]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-interstitial-title"
    >
      <div className="relative w-full max-w-md rounded-3xl glass-strong overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ backgroundImage: "var(--gradient-aurora)" }}
        />

        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-background/60 text-muted-foreground hover:text-foreground tap z-10"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="relative p-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1">
            <Sparkles className="size-3" /> 30-day free trial
          </div>
          <h2 id="trial-interstitial-title" className="mt-3 text-2xl font-semibold tracking-tight">
            Unlock the full lab
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            AI Coach, bloodwork insights, unlimited programs, weekly reports & physique collages.
          </p>

          <ul className="mt-4 space-y-1.5 text-sm">
            {[
              "30 days free, cancel anytime",
              "$12.99/month or $129.99/year after",
              "One-tap checkout",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" /> <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              to="/app/upgrade"
              search={{ plan: "premium_monthly" } as any}
              onClick={close}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center tap"
            >
              Start free trial
            </Link>
            <button
              onClick={close}
              className="w-full h-10 rounded-full text-xs text-muted-foreground hover:text-foreground tap"
            >
              Maybe later
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            <span className="inline-flex items-center gap-1"><CreditCard className="size-3" /> Card</span>
            <span className="inline-flex items-center gap-1"><Apple className="size-3" /> Apple Pay</span>
            <span className="inline-flex items-center gap-1"><LinkIcon className="size-3" /> Link</span>
          </div>
        </div>
      </div>
    </div>
  );
}
