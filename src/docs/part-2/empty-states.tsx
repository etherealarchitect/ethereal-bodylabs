import { DocPage, Section } from "@/components/docs/DocPage";

export default function EmptyStatesDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Empty States"
      summary="Turn zero-data screens into onramps."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Anatomy">
        <p>Illustration, headline, one-sentence value prop, one primary CTA, one secondary link to docs.</p>
      </Section>
      <Section title="Tone">
        <p>Confident and specific. 'No workouts yet — start with a 4-day upper/lower' beats 'Nothing here yet'.</p>
      </Section>
      <Section title="Never dead-end">
        <p>Every empty state has exactly one thing the user can do next.</p>
      </Section>
    </DocPage>
  );
}
