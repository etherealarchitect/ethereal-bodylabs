import { DocPage, Section } from "@/components/docs/DocPage";

export default function TransformationWorkflowDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Transformation Workflow"
      summary="Photo → comparison → decision."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Capture">
        <p>Guided pose, guided lighting, guided background. If any is off, we prompt to retake.</p>
      </Section>
      <Section title="Compare">
        <p>Side-by-side or overlay, aligned automatically. Timeline scrubber to jump across months.</p>
      </Section>
      <Section title="Decide">
        <p>The comparison feeds directly into a next-block decision: cut, bulk, recomp, or hold.</p>
      </Section>
    </DocPage>
  );
}
