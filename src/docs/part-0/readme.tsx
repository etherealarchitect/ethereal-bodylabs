import { DocPage, Section, List, Callout } from "@/components/docs/DocPage";

export default function ReadmeDoc() {
  return (
    <DocPage
      eyebrow="Part 0 · README"
      title="ETHEREAL BODYLABS"
      summary="A private, offline-first platform for training, nutrition, protocol tracking, and physique transformation — built to a spec, not vibes."
      meta={{ owner: "Core", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Project philosophy">
        <p>
          ETHEREAL BODYLABS treats the human body as a system worth documenting. Every workout,
          meal, protocol dose, and progress photo is a measurable event. The application exists to
          capture those events with clinical honesty, surface trends without noise, and remain
          fully usable on a phone with no signal.
        </p>
      </Section>
      <Section title="Mission">
        <p>Give one person the tools an entire coaching team would use — without surveillance.</p>
      </Section>
      <Section title="Vision">
        <p>
          A local-first, portable, encrypted profile format (<code>.ebp</code>) that follows the
          user across devices and years, with an AI layer that summarizes rather than diagnoses.
        </p>
      </Section>
      <Section title="Architecture">
        <List
          items={[
            "PWA client (TanStack Start, Tailwind v4, shadcn) with offline SQLite via wa-sqlite.",
            "Encrypted .ebp profile bundle as the source of truth; server is optional.",
            "Optional Cloud sync via Lovable Cloud for cross-device continuity.",
            "AI Platform with local-first vision pipeline; cloud fallback opt-in.",
          ]}
        />
      </Section>
      <Section title="Features">
        <List
          items={[
            "Workout Engine — programs, progression, RPE, volume, fatigue.",
            "Nutrition Engine — meals, macros, hydration, compliance.",
            "Protocol Engine — flexible habit/protocol tracker.",
            "Physique Lab — photo pipeline, transformation view, estimated body-fat trend.",
            "Analytics — KPIs, weekly/monthly/annual reports, plateau detection.",
          ]}
        />
      </Section>
      <Section title="Quick tour">
        <p>
          Open the app, import a starter <code>.ebp</code>, and the dashboard populates with a
          training plan, meal templates, protocol checklist, and a photo schedule. Nothing leaves
          your device unless you explicitly enable Cloud sync.
        </p>
      </Section>
      <Section title="Development">
        <p>
          The repository is TanStack Start with strict TypeScript. See{" "}
          <em>Part 16 · Coding Standards</em> for conventions and <em>Part 15 · Deployment</em>{" "}
          for the release pipeline.
        </p>
      </Section>
      <Section title="Roadmap">
        <List
          items={[
            "v0.1–0.5 · Docs, design system, engines scaffolded.",
            "v0.6 · Workout + Nutrition + Protocol MVP.",
            "v0.7 · Physique Lab beta.",
            "v0.8 · AI summaries + estimated body-fat trend.",
            "v1.0 · Full PWA, encrypted .ebp, Cloud sync opt-in.",
          ]}
        />
      </Section>
      <Section title="Contributing">
        <p>See <em>Part 16 · Contribution Guide</em>. All changes require an ADR when they alter architecture.</p>
      </Section>
      <Section title="Licence">
        <p>To be finalized — see <em>Part 17 · Licensing Strategy</em>.</p>
      </Section>
      <Section title="Support & FAQ">
        <p>See <em>Part 17 · Support Documentation</em> and <em>FAQ</em>.</p>
      </Section>
      <Section title="Glossary">
        <List
          items={[
            <><code>.ebp</code> — Ethereal Bodylabs Profile, the encrypted, portable data bundle.</>,
            <>RPE — Rate of Perceived Exertion, 1–10 subjective effort.</>,
            <>Protocol — A configurable habit or routine (supplements, sleep, cold exposure, etc.).</>,
          ]}
        />
      </Section>
      <Callout tone="info" title="This is a living document">
        Cross-links resolve as later parts are published. Status dots in the sidebar indicate
        which specs are Ready, Drafting, or Planned.
      </Callout>
    </DocPage>
  );
}
