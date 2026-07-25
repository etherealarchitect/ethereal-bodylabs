import { DocPage, Section, List, Callout } from "@/components/docs/DocPage";

const swatches = [
  { name: "background", token: "--background", className: "bg-background border" },
  { name: "surface-1", token: "--surface-1", className: "bg-surface-1 border" },
  { name: "surface-2", token: "--surface-2", className: "bg-surface-2 border" },
  { name: "surface-3", token: "--surface-3", className: "bg-surface-3 border" },
  { name: "primary", token: "--primary", className: "bg-primary" },
  { name: "primary-glow", token: "--primary-glow", className: "bg-primary-glow" },
  { name: "accent", token: "--accent", className: "bg-accent" },
  { name: "aurora-1", token: "--aurora-1", className: "bg-aurora-1" },
  { name: "aurora-2", token: "--aurora-2", className: "bg-aurora-2" },
  { name: "aurora-3", token: "--aurora-3", className: "bg-aurora-3" },
  { name: "success", token: "--success", className: "bg-success" },
  { name: "warning", token: "--warning", className: "bg-warning" },
  { name: "info", token: "--info", className: "bg-info" },
  { name: "destructive", token: "--destructive", className: "bg-destructive" },
  { name: "muted", token: "--muted", className: "bg-muted border" },
  { name: "border", token: "--border", className: "bg-border" },
];

const scale = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
  { name: "chart-6", className: "bg-chart-6" },
  { name: "chart-7", className: "bg-chart-7" },
  { name: "chart-8", className: "bg-chart-8" },
];

export default function DesignTokensDoc() {
  return (
    <DocPage
      eyebrow="Part 1 · Design Tokens"
      title="Design Tokens"
      summary="The single source of truth for color, type, spacing, elevation, and motion."
      meta={{ owner: "Design", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Callout tone="info" title="Tokens live in src/styles.css">
        Every color is oklch; every semantic token has a light and dark value. Components consume
        them through Tailwind utilities — <code>bg-primary</code>, not <code>bg-[#5b3fef]</code>.
      </Callout>

      <Section title="Color — semantic">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.name} className="rounded-lg border border-border/60 bg-card p-3">
              <div className={`mb-2 h-12 w-full rounded-md border-border/40 ${s.className}`} />
              <div className="font-mono text-[11px] text-foreground">{s.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{s.token}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Color — charts">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {scale.map((s) => (
            <div key={s.name} className="text-center">
              <div className={`mb-1.5 h-14 rounded-md ${s.className}`} />
              <div className="font-mono text-[10px] text-muted-foreground">{s.name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Gradients">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl p-6 aurora-bg">
            <div className="font-mono text-xs text-primary-foreground">--gradient-aurora</div>
          </div>
          <div className="rounded-xl p-6" style={{ backgroundImage: "var(--gradient-primary)" }}>
            <div className="font-mono text-xs text-primary-foreground">--gradient-primary</div>
          </div>
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-6">
          <p className="font-display text-4xl font-semibold tracking-tight">Display · Space Grotesk</p>
          <p className="font-sans text-base">Body · Inter — the workout is the argument.</p>
          <p className="font-mono text-sm text-muted-foreground">Mono · JetBrains Mono · 12.5kg × 8</p>
        </div>
      </Section>

      <Section title="Spacing scale">
        <div className="flex flex-wrap items-end gap-2">
          {[1, 2, 3, 4, 6, 8, 12, 16, 20, 24].map((n) => (
            <div key={n} className="text-center">
              <div className="bg-primary rounded" style={{ width: n * 4, height: n * 4 }} />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{n}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-3">
          {["sm", "md", "lg", "xl", "2xl", "3xl"].map((r) => (
            <div key={r} className="text-center">
              <div className={`h-16 w-24 bg-surface-2 border border-border rounded-${r}`} />
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">rounded-{r}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["xs", "sm", "md", "lg", "glow"] as const).map((tier) => (
            <div
              key={tier}
              className="rounded-xl bg-card p-6 text-center"
              style={{ boxShadow: `var(--shadow-${tier})` }}
            >
              <div className="font-mono text-xs">shadow-{tier}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Motion">
        <List
          items={[
            <>Fast · <code>120ms</code> — micro-feedback (button press, toggle).</>,
            <>Base · <code>220ms</code> — panel enter, tab change.</>,
            <>Slow · <code>420ms</code> — page transition, celebratory moments.</>,
            <>Always suspended under <code>prefers-reduced-motion</code>.</>,
          ]}
        />
      </Section>
    </DocPage>
  );
}
