import { DocPage, Section } from "@/components/docs/DocPage";

export default function FeedbackSystemsDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Feedback Systems"
      summary="Haptics, sound, motion working together."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Haptics">
        <p>Light for confirmation, medium for state changes, heavy for warnings. Never for decoration.</p>
      </Section>
      <Section title="Sound">
        <p>Optional. When enabled, sounds are short, tonal, and never played twice within 500ms.</p>
      </Section>
      <Section title="Motion">
        <p>Reinforces cause and effect. If nothing changed, nothing animates.</p>
      </Section>
    </DocPage>
  );
}
