import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles, ArrowRight, Dumbbell, Apple, Camera, FlaskConical, Bot, Smartphone } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ETHEREAL BODYLABS" },
      {
        name: "description",
        content:
          "Start free with 30 days of Premium. Then $12.99/month or $129.99/year — cancel anytime. AI coach, workouts, macros, bloodwork, and physique timelines.",
      },
      { property: "og:title", content: "ETHEREAL BODYLABS — Simple pricing" },
      {
        property: "og:description",
        content:
          "Every athlete starts with 30 days of Premium free. $12.99/mo or $129.99/yr after — cancel anytime.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ethereal-bodylabs.lovable.app/pricing" },
      { property: "og:image", content: "https://ethereal-bodylabs.lovable.app/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ETHEREAL BODYLABS — Simple pricing" },
      { name: "twitter:description", content: "30 days of Premium free. $12.99/mo or $129.99/yr after — cancel anytime." },
      { name: "twitter:image", content: "https://ethereal-bodylabs.lovable.app/twitter-card.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://ethereal-bodylabs.lovable.app/pricing" }],
  }),
  component: PricingPage,
});


const FREE_FEATURES = [
  "Workout & meal logging",
  "Physique photos & measurements",
  "Basic protocol tracking",
  "Installable PWA (iOS & Android)",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "AI Coach chat (Alice) with your data in context",
  "AI bloodwork analysis + downloadable PDF reports",
  "Unlimited training programs & meal templates",
  "Weekly progress reports & auto start-vs-current collages",
  "Advanced insights, streaks & achievements",
  "Priority feature access",
];

function PricingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Aurora background — matches landing */}
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
          <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md aurora-bg text-primary-foreground shadow-glow">
              <Sparkles className="size-3.5" />
            </span>
            ETHEREAL BODYLABS
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Home
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
        <section className="mx-auto max-w-[1000px] px-6 pt-12 pb-10 text-center sm:px-10 sm:pt-16">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-1/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
            <span className="size-1.5 rounded-full bg-success" />
            30 days Premium — free, no card up front
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            One app. <span className="aurora-text">One honest price.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Every new athlete starts with 30 days of Premium free. After that it's $12.99/month
            or $129.99/year — cancel anytime, keep your data forever.
          </p>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-[1100px] px-6 pb-6 sm:px-10">
          <div className="grid gap-4 md:grid-cols-3">
            <PlanCard
              title="Free"
              price="$0"
              cadence="forever"
              features={FREE_FEATURES}
              ctaLabel="Create free account"
              ctaTo="/auth"
              ctaSearch={{ plan: "free", mode: "signup" }}
            />
            <PlanCard
              title="Premium · Monthly"
              price="$12.99"
              cadence="per month"
              highlight
              badge="30-day free trial"
              features={PREMIUM_FEATURES}
              ctaLabel="Start 30-day free trial"
              ctaTo="/auth"
              ctaSearch={{ plan: "premium_monthly", mode: "signup" }}
            />
            <PlanCard
              title="Premium · Yearly"
              price="$129.99"
              cadence="per year"
              badge="Save ~17%"
              subtle="Works out to $10.83/month"
              features={PREMIUM_FEATURES}
              ctaLabel="Start with yearly"
              ctaTo="/auth"
              ctaSearch={{ plan: "premium_yearly", mode: "signup" }}
            />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Trial requires a payment method. You won't be charged until day 30 — cancel any time before
            then and pay nothing. Prices in USD, taxes may apply.
          </p>
        </section>

        {/* What's included */}
        <section className="mx-auto max-w-[1300px] px-6 py-16 sm:px-10">
          <div className="mb-8 max-w-2xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              What Premium unlocks
            </div>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Everything you need to train, track, and transform.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={<Dumbbell className="size-5" />} title="Workout logging" body="Program builder, PRs, estimated 1RMs, rest timer, and clean session history." />
            <Feature icon={<Apple className="size-5" />} title="Nutrition & macros" body="Meal templates, daily targets from your goal, and a fast add-food flow." />
            <Feature icon={<Camera className="size-5" />} title="Physique timeline" body="Weekly check-ins, start-vs-current collages, and side-by-side comparisons." />
            <Feature icon={<FlaskConical className="size-5" />} title="Bloodwork insights" body="Upload any AU panel and get a personalised, medically-grounded report and PDF." />
            <Feature icon={<Bot className="size-5" />} title="Alice, your AI coach" body="A private coach that reads your workouts, meals, and photos — and actually helps." />
            <Feature icon={<Smartphone className="size-5" />} title="Installable PWA" body="Add to home screen. Works offline. Feels native on iOS and Android." />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[900px] px-6 pb-16 sm:px-10">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight">Common questions</h2>
          <div className="space-y-4">
            <Faq q="Do I need a card to start?" a="No card up front for the free tier. Premium's 30-day trial requires a card so it can convert automatically — you won't be charged until day 30." />
            <Faq q="Can I cancel anytime?" a="Yes. Cancel from your billing page in seconds — you keep Premium until the end of the current period, no questions asked." />
            <Faq q="Can I switch between monthly and yearly?" a="Anytime, from the billing page. Upgrades are prorated instantly, downgrades apply as a credit on your next invoice." />
            <Faq q="What happens to my data if I downgrade?" a="Nothing disappears. Your workouts, meals, photos, and bloodwork stay in your account, and you can export the whole thing as a portable .ebp file anytime." />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border/60 bg-surface-1/40">
          <div className="mx-auto max-w-[1000px] px-6 py-16 text-center sm:px-10">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to make the next 12 months count?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create your account and get 30 days of Premium on the house.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ plan: "premium_monthly", mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 aurora-bg"
              >
                Start free — 30 days Premium
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-surface-1/50 px-5 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface-2"
              >
                Back to home
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

function PlanCard({
  title,
  price,
  cadence,
  features,
  ctaLabel,
  ctaTo,
  ctaSearch,
  highlight,
  badge,
  subtle,
}: {
  title: string;
  price: string;
  cadence: string;
  features: string[];
  ctaLabel: string;
  ctaTo: string;
  ctaSearch?: Record<string, string>;
  highlight?: boolean;
  badge?: string;
  subtle?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 backdrop-blur ${
        highlight
          ? "border-primary/70 bg-primary/[0.06] shadow-glow"
          : "border-border/60 bg-card/60"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
        {badge && (
          <div className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
            {badge}
          </div>
        )}
      </div>
      <div className="mb-1 flex items-baseline gap-1.5">
        <div className="font-display text-4xl font-semibold">{price}</div>
        <div className="text-sm text-muted-foreground">{cadence}</div>
      </div>
      {subtle && <div className="mb-4 text-xs text-muted-foreground">{subtle}</div>}
      {!subtle && <div className="mb-4 h-4" />}
      <ul className="mb-6 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaTo}
        search={ctaSearch as never}
        className={`block h-11 rounded-lg text-center text-sm font-medium leading-[44px] transition-transform hover:-translate-y-0.5 ${
          highlight
            ? "aurora-bg text-primary-foreground shadow-glow"
            : "border border-border/60 bg-background"
        }`}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <summary className="cursor-pointer list-none text-sm font-medium">
        <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-90">›</span>
        {q}
      </summary>
      <p className="mt-2 pl-4 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}
