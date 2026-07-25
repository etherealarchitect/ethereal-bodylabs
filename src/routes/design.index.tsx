import { createFileRoute, Link } from "@tanstack/react-router";
import { DocShell } from "@/components/docs/DocShell";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/design/")({
  head: () => ({
    meta: [
      { title: "Design System — ETHEREAL BODYLABS" },
      {
        name: "description",
        content:
          "Ethereal Aurora: tokens, components, and patterns powering ETHEREAL BODYLABS.",
      },
      { property: "og:title", content: "ETHEREAL BODYLABS Design System" },
      { property: "og:description", content: "Tokens, components, and patterns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DesignHome,
});

function DesignHome() {
  return (
    <DocShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          Design System · Ethereal Aurora
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight">
          The system behind every screen.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Deep indigo foundation, aurora accents, glassy surfaces. Every component consumes
          semantic tokens — never hardcoded colors — so the whole system re-themes at once.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Tile
            eyebrow="Foundations"
            title="Design Tokens"
            body="Color, typography, spacing, elevation, motion — the full reference."
            to="/docs/$part/$slug"
            params={{ part: "part-1", slug: "design-tokens" }}
          />
          <Tile
            eyebrow="Foundations"
            title="Design Philosophy"
            body="Visual, interaction, motion, accessibility, performance principles."
            to="/docs/$part/$slug"
            params={{ part: "part-1", slug: "design-philosophy" }}
          />
          <Tile
            eyebrow="Library"
            title="Component Library"
            body="Every component with props, states, a11y, and interaction specs."
            to="/docs/$part/$slug"
            params={{ part: "part-1", slug: "component-library" }}
          />
          <Tile
            eyebrow="UX"
            title="Interaction & States"
            body="Empty, loading, and error states specified across every screen."
            to="/docs/$part"
            params={{ part: "part-2" }}
          />
        </div>

        <section className="mt-14 rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Preview</div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
            The aurora, applied.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl p-6 aurora-bg">
              <div className="text-xs uppercase tracking-[0.16em] text-primary-foreground/80">
                Weekly Score
              </div>
              <div className="mt-2 font-display text-4xl font-semibold text-primary-foreground">
                87
              </div>
              <div className="mt-1 text-xs text-primary-foreground/80">+4 vs last week</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface-1 p-6 shadow-glow">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Volume</div>
              <div className="mt-2 font-display text-4xl font-semibold aurora-text">12,400 kg</div>
              <div className="mt-1 text-xs text-success">+8.2% trend</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface-2 p-6">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Adherence
              </div>
              <div className="mt-2 font-display text-4xl font-semibold">94%</div>
              <div className="mt-1 text-xs text-muted-foreground">28-day rolling</div>
            </div>
          </div>
        </section>
      </div>
    </DocShell>
  );
}

function Tile({
  eyebrow,
  title,
  body,
  to,
  params,
}: {
  eyebrow: string;
  title: string;
  body: string;
  to: "/docs/$part" | "/docs/$part/$slug";
  params: Record<string, string>;
}) {
  return (
    <Link
      to={to as "/docs/$part/$slug"}
      params={params as { part: string; slug: string }}
      className="group flex flex-col rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-all hover:border-primary/50 hover:bg-card"
    >

      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </div>
      <div className="mt-2 font-display text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
        {title}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary">
        Open <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}
