import { DocPage, Section } from "@/components/docs/DocPage";

export default function OnboardingDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Onboarding"
      summary="Progressive, not front-loaded."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Step 1">
        <p>Goal + training days. Everything else is optional.</p>
      </Section>
      <Section title="Step 2">
        <p>Starter profile assignment. The user gets a real program on day one.</p>
      </Section>
      <Section title="Step 3">
        <p>Just-in-time: we ask for meal preferences the first time the user logs a meal, not before.</p>
      </Section>
    </DocPage>
  );
}
