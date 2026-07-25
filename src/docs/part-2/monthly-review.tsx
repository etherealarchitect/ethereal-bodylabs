import { DocPage, Section } from "@/components/docs/DocPage";

export default function MonthlyReviewDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Monthly Review"
      summary="The bigger picture without the noise."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Scope">
        <p>Four weeks aggregated: volume trend, adherence trend, weight trend, estimated body-fat trend.</p>
      </Section>
      <Section title="Narrative">
        <p>One paragraph auto-generated from the data, editable by the user, stored in the profile.</p>
      </Section>
      <Section title="Outcome">
        <p>Confirm or change the current block. This is the moment the user re-plans.</p>
      </Section>
    </DocPage>
  );
}
