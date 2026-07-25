import { DocPage, Section } from "@/components/docs/DocPage";

export default function LoadingStatesDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Loading States"
      summary="Skeletons, spinners, and perceived performance."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Under 200ms">
        <p>No indicator. Just render.</p>
      </Section>
      <Section title="200ms–1s">
        <p>Skeleton matching the target layout. Never a spinner on a page.</p>
      </Section>
      <Section title="Over 1s">
        <p>Skeleton + progress affordance. If we can estimate, we show percentage; otherwise indeterminate.</p>
      </Section>
    </DocPage>
  );
}
