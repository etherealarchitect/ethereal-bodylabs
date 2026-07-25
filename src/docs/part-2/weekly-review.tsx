import { DocPage, Section } from "@/components/docs/DocPage";

export default function WeeklyReviewDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Weekly Review"
      summary="The Sunday ritual that ties the week together."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Structure">
        <p>Wins, misses, next-week focus. Three cards, no scroll on a phone.</p>
      </Section>
      <Section title="Data">
        <p>Training volume, nutrition adherence, protocol compliance, weight delta, photo diff (if taken).</p>
      </Section>
      <Section title="Output">
        <p>A single next-week intention the user commits to. Written by the user, remembered by the app.</p>
      </Section>
    </DocPage>
  );
}
