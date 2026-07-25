import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Dumbbell, Apple, Camera, FlaskConical, Bot, Smartphone, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ETHEREAL BODYLABS — Train, Track, Transform" },
      {
        name: "description",
        content:
          "The all-in-one training, nutrition, physique, and protocol app. AI coach, workout logging, macro tracking, bloodwork insights, and physique timelines — in your pocket.",
      },
      { property: "og:title", content: "ETHEREAL BODYLABS — Train, Track, Transform" },
      {
        property: "og:description",
        content:
          "Your private training, nutrition, and physique lab. AI coach, workouts, macros, bloodwork, and progress photos — all in one app.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ethereal-bodylabs.lovable.app/" },
      { property: "og:image", content: "https://ethereal-bodylabs.lovable.app/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "ETHEREAL BODYLABS — Train. Track. Transform." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ETHEREAL BODYLABS — Train, Track, Transform" },
      { name: "twitter:description", content: "Your private training, nutrition, and physique lab. AI coach, workouts, macros, bloodwork, and progress photos — all in one app." },
      { name: "twitter:image", content: "https://ethereal-bodylabs.lovable.app/twitter-card.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://ethereal-bodylabs.lovable.app/" }],
  }),


  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{ backgroundImage: "var(--gradient-aurora)" }}
        />
        <div
          className="absolute top-[40%] -right-40 h-[380px] w-[380px] rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: "var(--aurora-2)" }}
        />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md aurora-bg text-primary-foreground shadow-glow">
              <Sparkles className="size-3.5" />
            </span>
            ETHEREAL BODYLABS
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/pricing" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Pricing
            </Link>
            <Link to="/auth" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Sign in
            </Link>
            <Link to="/app" className="rounded-md bg-primary/15 px-3 py-1.5 font-medium text-primary transition-colors hover:bg-primary/25">
              Open App →
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-[1200px] px-6 pt-16 pb-24 text-center sm:px-10 sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-1/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-success" />
            30 days Premium — free, no card up front
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-semibold tracking-tight sm:text-7xl">
            Train, track, and transform with{" "}
            <span className="aurora-text">ETHEREAL BODYLABS</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            The all-in-one app for serious lifters. Log workouts, hit your macros, capture your
            physique, read your bloodwork, and get an AI coach that actually knows your data —
            private, offline-ready, and built for the long haul.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ plan: "premium_monthly", mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 aurora-bg"
            >
              Start free — 30 days Premium
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/auth"
              search={{ plan: "premium_yearly", mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/20"
            >
              Go yearly — save ~17%
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-surface-1/50 px-5 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface-2"
            >
              See pricing
            </Link>
          </div>

          <ul className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Install as an app on iOS & Android</li>
            <li className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Your data stays yours — export anytime</li>
            <li className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-primary" /> Cancel any time</li>
          </ul>
        </section>

        {/* Features grid */}
        <section className="mx-auto max-w-[1300px] px-6 pb-24 sm:px-10">
          <div className="mb-10 max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Everything in one app
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              One app for the whole system — no more juggling five.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Dumbbell className="size-5" />}
              title="Workout logging"
              body="Program builder, PRs and estimated 1RMs, rest timer, and clean session history."
            />
            <Feature
              icon={<Apple className="size-5" />}
              title="Nutrition & macros"
              body="Meal templates, daily targets from your goal, and a fast add-food flow."
            />
            <Feature
              icon={<Camera className="size-5" />}
              title="Physique timeline"
              body="Weekly check-ins, start-vs-current collages, and side-by-side comparisons."
            />
            <Feature
              icon={<FlaskConical className="size-5" />}
              title="Bloodwork insights"
              body="Upload any AU panel and get a personalised, medically-grounded report and PDF."
            />
            <Feature
              icon={<Bot className="size-5" />}
              title="AI coach"
              body="A private coach that reads your workouts, meals, and photos — and actually helps."
            />
            <Feature
              icon={<Smartphone className="size-5" />}
              title="Installable PWA"
              body="Add to home screen. Works offline. Feels native on iOS and Android."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60 bg-surface-1/40">
          <div className="mx-auto max-w-[1000px] px-6 py-20 text-center sm:px-10">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to make the next 12 months count?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create your account and get 30 days of Premium on the house. No card up front.
              After that it's <strong className="text-foreground">$12.99/month</strong>, cancel anytime.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ plan: "premium_monthly", mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 aurora-bg"
              >
                Create your account
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/auth"
                search={{ plan: "free", mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-surface-1/50 px-5 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface-2"
              >
                Start on Free
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60 py-10">
          <div className="mx-auto max-w-[1500px] px-6 text-center text-xs text-muted-foreground sm:px-10">
            ETHEREAL BODYLABS · Train, track, transform · © {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
