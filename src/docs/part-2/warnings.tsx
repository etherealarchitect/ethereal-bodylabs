import { DocPage, Section } from "@/components/docs/DocPage";

export default function WarningsDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Warnings"
      summary="Nudges when data suggests risk."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Triggers">
        <p>Rapid weight change, missed doses on critical protocols, RPE trending up while sleep trends down.</p>
      </Section>
      <Section title="Tone">
        <p>Concerned, not alarmist. We surface the pattern and invite reflection; we never diagnose.</p>
      </Section>
      <Section title="Dismissal">
        <p>Warnings can be muted per-category. Muted warnings still appear in the weekly review.</p>
      </Section>
    </DocPage>
  );
}
