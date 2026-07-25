import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { readPlanIntent, clearPlanIntent, type PlanIntent } from "@/lib/plan-intent";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — ETHEREAL BODYLABS" },
      { name: "description", content: "Completing sign-in and returning you to the app." },
      { name: "robots", content: "noindex, nofollow" },
    ],

  }),
  component: CallbackPage,
});

function resolvePlan(url: URL): PlanIntent | null {
  const raw = url.searchParams.get("plan");
  if (raw === "free" || raw === "premium_monthly" || raw === "premium_yearly") return raw;
  return readPlanIntent();
}

function resolveNext(url: URL): string | null {
  const raw = url.searchParams.get("next");
  if (!raw) return null;
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

function landing(plan: PlanIntent | null, next: string | null) {
  if (next) return { href: next as string } as const;
  if (plan === "premium_monthly" || plan === "premium_yearly") {
    clearPlanIntent();
    return { to: "/app/upgrade" as const, search: { plan } };
  }
  if (plan === "free") clearPlanIntent();
  return { to: "/app" as const };
}

function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const err = url.searchParams.get("error_description") || url.searchParams.get("error");
      if (err) {
        setError(decodeURIComponent(err));
        return;
      }
      const plan = resolvePlan(url);
      const next = resolveNext(url);

      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) { setError(error.message); return; }
      }
      const goLanding = () => {
        const dest = landing(plan, next);
        if ("href" in dest && dest.href) {
          window.location.assign(dest.href);
        } else {
          navigate({ ...dest, replace: true } as any);
        }
      };
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        goLanding();
      } else {
        const sub = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            sub.data.subscription.unsubscribe();
            goLanding();
          }
        });
        setTimeout(() => {
          sub.data.subscription.unsubscribe();
          if (!error) navigate({ to: "/auth", replace: true });
        }, 3000);
      }
    })();
  }, [navigate, error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
      <div className="text-center">
        {error ? (
          <>
            <AlertCircle className="mx-auto size-8 text-destructive" />
            <h1 className="mt-4 text-lg font-medium">Sign-in failed.</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">{error}</p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-6 rounded-xl border border-border/60 bg-surface-2 px-4 py-2 text-sm hover:border-primary"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Signing you in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
