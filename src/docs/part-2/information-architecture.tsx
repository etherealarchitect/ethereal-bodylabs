import { DocPage, Section } from "@/components/docs/DocPage";

export default function InformationArchitectureDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Information Architecture"
      summary="How screens, entities and navigation are organized."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Top-level surfaces">
        <p>Dashboard, Train, Nourish, Track, Physique, Insights, Settings. Seven destinations, never more.</p>
      </Section>
      <Section title="Entity model">
        <p>Everything is a Record (workout, meal, dose, photo, measurement). Records aggregate into Days, Weeks, Programs, Protocols.</p>
      </Section>
      <Section title="Navigation grammar">
        <p>Bottom tabs for surfaces, top-right for context actions, long-press for power actions. Back always undoes navigation, never data.</p>
      </Section>
    </DocPage>
  );
}
