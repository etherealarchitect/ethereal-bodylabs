import { DocPage, Section } from "@/components/docs/DocPage";

export default function InteractionDesignDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Interaction Design"
      summary="Input patterns, affordances, and the two-tap rule."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Primary actions">
        <p>Every screen has one hero action rendered as an aurora-gradient button. Secondary actions are tonal; tertiary are ghost.</p>
      </Section>
      <Section title="Feedback loops">
        <p>Every touch produces a response within 100ms — visual, haptic, or both. Ambiguity is a bug.</p>
      </Section>
      <Section title="Confirmation policy">
        <p>Destructive actions confirm; reversible actions do not. Undo is always preferred over a modal.</p>
      </Section>
    </DocPage>
  );
}
