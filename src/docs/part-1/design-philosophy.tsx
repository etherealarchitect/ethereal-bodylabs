import { DocPage, Section, List } from "@/components/docs/DocPage";

export default function DesignPhilosophyDoc() {
  return (
    <DocPage
      eyebrow="Part 1 · Design Philosophy"
      title="Design Philosophy"
      summary="The principles that keep every pixel in ETHEREAL BODYLABS coherent."
      meta={{ owner: "Design", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Visual identity">
        <p>
          <strong>Ethereal Aurora.</strong> A deep indigo foundation, aurora-like accents in
          violet, cyan, and green, and glassy surfaces that suggest laboratory precision without
          feeling clinical. The mood is <em>quiet intensity</em>: a serious tool that respects the
          user's attention.
        </p>
      </Section>
      <Section title="Interaction philosophy">
        <List
          items={[
            "Two-tap rule: any daily action must be reachable in ≤2 taps from the dashboard.",
            "One primary action per screen. Everything else is secondary or tertiary.",
            "Optimistic UI on every write. Rollback is silent unless the user needs to act.",
          ]}
        />
      </Section>
      <Section title="Animation philosophy">
        <List
          items={[
            "Motion clarifies causality. Never decorative.",
            "220ms base duration, standard easing. Enter faster than exit.",
            "prefers-reduced-motion always honored — no exceptions.",
          ]}
        />
      </Section>
      <Section title="Accessibility philosophy">
        <p>
          Accessibility is a floor, not a feature. WCAG 2.2 AA is the minimum bar; we design for
          the harder cases (sunlight, sweat on the screen, one-handed use in the gym) and
          everything else falls out.
        </p>
      </Section>
      <Section title="Performance philosophy">
        <p>
          The app must feel instant on the phone the user actually has, not the phone the designer
          uses. Every screen is budgeted; every dependency is questioned; every image is measured.
        </p>
      </Section>
    </DocPage>
  );
}
