import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { startReminders } from "@/lib/reminders";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { AnnouncementBanner } from "@/components/app/AnnouncementBanner";
import { AliceFab } from "@/components/app/AliceFab";
import { TrialInterstitial } from "@/components/app/TrialInterstitial";
import { isAdminEmail } from "@/components/AdminGate";
import { Activity, Apple, CheckCircle2, Camera, User, LogOut, Dumbbell, Sparkles, ShieldCheck } from "lucide-react";

const NAV: { to: string; label: string; icon: typeof Activity; exact?: boolean }[] = [
  { to: "/app", label: "Today", icon: Activity, exact: true },
  { to: "/app/workouts", label: "Train", icon: Dumbbell },
  { to: "/app/nutrition", label: "Fuel", icon: Apple },
  { to: "/app/protocol", label: "Rite", icon: CheckCircle2 },
  { to: "/app/physique", label: "Lab", icon: Camera },
  { to: "/app/coach", label: "Coach", icon: Sparkles },
  { to: "/app/profile", label: "You", icon: User },
];

// Group related routes together so top-level nav highlighting works across sub-pages.
const GROUPS: Record<string, string> = {
  "/app/exercises": "/app/workouts",
  "/app/records": "/app/workouts",
  "/app/programs": "/app/workouts",
  "/app/insights": "/app/physique",
  "/app/bloodwork": "/app/physique",
  "/app/photos/compare": "/app/physique",
  "/app/reports": "/app",
  "/app/doses": "/app/protocol",
  "/app/settings": "/app/profile",
};

export function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Start any local daily reminders the user previously enabled.
  useEffect(() => { if (user) startReminders(); }, [user]);

  // Redirect first-run users into onboarding.
  const { data: profile } = useQuery({
    queryKey: ["profile-onboarding", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("onboarding_complete").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (profile && profile.onboarding_complete === false && pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [profile, pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 relative">
      {/* Soft violet ambient wash */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] -z-0"
        style={{ background: "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)" }}
      />

      <PaymentTestModeBanner />
      <AnnouncementBanner />

      <header className="sticky top-0 z-20 glass-bar border-b px-5 py-3 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          Ethereal · Bodylab
        </div>
        <div className="flex items-center gap-2">
          {isAdminEmail(user.email) && (
            <Link
              to="/app/admin"
              className="inline-flex items-center gap-1 rounded-full bg-secondary text-foreground text-[10px] font-medium px-2.5 py-1 tap"
              title="Admin"
            >
              <ShieldCheck className="size-3" /> Admin
            </Link>
          )}
          <PremiumBadge />
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary tap"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 px-5 pt-5 pb-8 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-3 inset-x-3 z-20 mx-auto max-w-[calc(theme(maxWidth.lg)-1.5rem)] rounded-[28px] glass-strong shadow-xl border border-border/50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        <div className="grid grid-cols-7 h-[64px] px-1.5 gap-0.5">
          {NAV.map((item) => {
            const activePath = GROUPS[pathname] ?? pathname;
            const active = item.exact ? activePath === item.to : activePath.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`group relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium tap rounded-2xl transition-colors ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span
                    className="absolute inset-1 -z-0 rounded-2xl bg-primary shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                    style={{ backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--primary) 100%, transparent), color-mix(in oklab, var(--primary) 82%, transparent))" }}
                  />
                )}
                <Icon className={`relative z-10 transition-transform ${active ? "size-[20px] scale-110" : "size-[19px] group-hover:scale-105"}`} strokeWidth={active ? 2.4 : 2} />
                <span className="relative z-10 leading-none tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <TrialInterstitial />
      <AliceFab />
    </div>
  );
}

/* ---------- premium/trial badge ---------- */
function PremiumBadge() {
  const { tier, isTrialing, trialDaysLeft, loading } = useSubscription();
  if (loading) return null;
  if (tier === "premium") {
    return (
      <Link
        to="/app/upgrade"
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2.5 py-1 tap"
      >
        <Sparkles className="size-3" />
        {isTrialing ? `Trial · ${trialDaysLeft ?? 0}d` : "Premium"}
      </Link>
    );
  }
  return (
    <Link
      to="/app/upgrade"
      className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-2.5 py-1 tap"
    >
      <Sparkles className="size-3" /> Upgrade
    </Link>
  );
}

/* ---------- shared card ---------- */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl glass p-4 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow, title, action,
}: {
  eyebrow?: string; title: string; action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  title, hint, cta,
}: {
  title: string; hint?: string; cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
