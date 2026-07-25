import { DocPage, Section } from "@/components/docs/DocPage";

export default function NotificationDesignDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Notification Design"
      summary="Reminders, achievements, warnings without noise."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Budget">
        <p>Three notifications per day maximum, by default. The user can raise the cap but we do not.</p>
      </Section>
      <Section title="Categories">
        <p>Reminder, achievement, warning, system. Each has distinct sound, icon, and priority.</p>
      </Section>
      <Section title="Actionability">
        <p>Every notification carries at least one action — reply, snooze, mark done — reachable from the lock screen.</p>
      </Section>
    </DocPage>
  );
}
