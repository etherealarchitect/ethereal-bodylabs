import { DocPage, Section } from "@/components/docs/DocPage";

export default function CoachWorkflowDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Coach Workflow"
      summary="Power users managing other athletes."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Profile import/export">
        <p>Coaches share .ebp files with athletes via any channel. No cloud dependency.</p>
      </Section>
      <Section title="Program authoring">
        <p>Coaches build reusable templates with progression rules and assign them per athlete.</p>
      </Section>
      <Section title="Review cadence">
        <p>Coaches review athlete weekly summaries with annotations that sync back on next import.</p>
      </Section>
    </DocPage>
  );
}
