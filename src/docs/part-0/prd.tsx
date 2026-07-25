import { DocPage, Section, List } from "@/components/docs/DocPage";

export default function PrdDoc() {
  return (
    <DocPage
      eyebrow="Part 0 · Product Requirements"
      title="Product Requirements Document"
      summary="Concrete goals, personas, and acceptance criteria for v1.0."
      meta={{ owner: "Product", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Goals">
        <List
          items={[
            "Deliver a single PWA that fully replaces 4+ fitness apps.",
            "Ship a portable, encrypted profile format (.ebp).",
            "Provide analytics that a coach would trust.",
          ]}
        />
      </Section>
      <Section title="Objectives">
        <List
          items={[
            "Complete workout, nutrition, protocol, and physique modules by v0.9.",
            "Pass WCAG 2.2 AA on every screen.",
            "Sub-200ms interaction latency on mid-tier Android.",
          ]}
        />
      </Section>
      <Section title="Constraints">
        <List
          items={[
            "Must run offline. No hard network dependency at runtime.",
            "Must fit within a 20MB installable PWA shell.",
            "Must remain self-hostable.",
          ]}
        />
      </Section>
      <Section title="Personas">
        <List
          items={[
            "Ari — 32, natural bodybuilder, tracks daily, exports weekly to coach.",
            "Sam — 28, self-experimenter running a 12-week protocol stack.",
            "Kai — 45, recomp phase, cares about long-horizon photo trend.",
          ]}
        />
      </Section>
      <Section title="User stories">
        <List
          items={[
            "As a lifter, I can start today's workout in ≤2 taps from the dashboard.",
            "As a user, I can export my entire profile to a .ebp file and re-import it on a new device.",
            "As a self-experimenter, I can define a custom protocol and see adherence over time.",
          ]}
        />
      </Section>
      <Section title="Acceptance criteria">
        <List
          items={[
            "Every screen has empty, loading, and error states specified in Part 2.",
            "Every write path has an optimistic UI and a conflict recovery path.",
            "Every mutation is captured in an audit log.",
          ]}
        />
      </Section>
      <Section title="Performance targets">
        <List
          items={[
            "First contentful paint &lt; 1.5s on 4G.",
            "Time-to-interactive &lt; 3s on mid-tier Android.",
            "Photo pipeline preprocessing &lt; 800ms per image on-device.",
          ]}
        />
      </Section>
      <Section title="Security requirements">
        <p>See Part 13. Minimum: AES-GCM at rest, TLS 1.3 in transit, no third-party analytics.</p>
      </Section>
      <Section title="Accessibility requirements">
        <p>WCAG 2.2 AA, full keyboard support, reduced-motion honored, screen-reader labels on all icons.</p>
      </Section>
      <Section title="Deployment targets">
        <List
          items={[
            "PWA installable on iOS 17+, Android 12+, desktop Chrome/Edge/Firefox.",
            "Self-hosted Docker image (see Part 15).",
            "Managed Cloud tier (opt-in).",
          ]}
        />
      </Section>
      <Section title="Release requirements">
        <List
          items={[
            "Every release ships with migration script and changelog.",
            "No breaking .ebp format changes without a bump + migration.",
          ]}
        />
      </Section>
      <Section title="Technical debt strategy">
        <p>
          Tracked as ADRs in Part 16. Each debt item has an owner, a due milestone, and a payoff
          plan; nothing lingers un-owned.
        </p>
      </Section>
    </DocPage>
  );
}
