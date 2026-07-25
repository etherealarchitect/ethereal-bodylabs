import { DocPage, Section } from "@/components/docs/DocPage";

export default function RemindersDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Reminders"
      summary="Rule-based prompts that respect the user's rhythm."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Sources">
        <p>Protocol schedules, meal windows, workout days, hydration cadence, custom rules.</p>
      </Section>
      <Section title="Delivery">
        <p>Local notifications by default. Push is opt-in and only used for cross-device sync events.</p>
      </Section>
      <Section title="Escalation">
        <p>Missed reminders never re-fire more than twice. After that, they move to the daily digest.</p>
      </Section>
    </DocPage>
  );
}
