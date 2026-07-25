import { DocPage, Section } from "@/components/docs/DocPage";

export default function GesturesTouchDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Gestures & Touch"
      summary="Swipes, long-presses, hit targets, one-handed use."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Hit targets">
        <p>44×44pt minimum. Cards use full-width tap regions with internal secondary actions escaping via a dedicated overflow control.</p>
      </Section>
      <Section title="Gesture vocabulary">
        <p>Swipe-left to complete, swipe-right to skip, long-press to enter selection mode. Never overload a gesture with more than one meaning per surface.</p>
      </Section>
      <Section title="One-handed mode">
        <p>All primary actions live in the bottom third of the screen. Top-of-screen chrome is display-only.</p>
      </Section>
    </DocPage>
  );
}
