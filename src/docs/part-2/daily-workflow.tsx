import { DocPage, Section } from "@/components/docs/DocPage";

export default function DailyWorkflowDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Daily Workflow"
      summary="The 90 seconds a day the app must earn."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Morning">
        <p>Weight log, weather-aware reminder for outdoor training, protocol checklist glance.</p>
      </Section>
      <Section title="Training window">
        <p>Warm-up card auto-suggested, workout logged in-flow, cooldown queued.</p>
      </Section>
      <Section title="Evening">
        <p>Meal recap, hydration check, tomorrow's plan preview.</p>
      </Section>
    </DocPage>
  );
}
