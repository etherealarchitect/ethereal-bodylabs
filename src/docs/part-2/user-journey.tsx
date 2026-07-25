import { DocPage, Section } from "@/components/docs/DocPage";

export default function UserJourneyDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="User Journey"
      summary="The end-to-end arc from install to year-two mastery."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="First 60 seconds">
        <p>The user lands on a single question: what are you optimizing? Body, strength, health, or all three. That choice seeds the starter profile, the dashboard layout, and the first week of programming.</p>
      </Section>
      <Section title="Day 1 to Week 1">
        <p>Onboarding is progressive. We ask for the minimum to be useful today (weight, goal, training days) and defer everything else to just-in-time prompts inside real workflows.</p>
      </Section>
      <Section title="Month 1 to Month 3">
        <p>The user builds trust through visible wins: streaks, PRs, first transformation photo comparison. Analytics unlock as data accrues; nothing is empty.</p>
      </Section>
      <Section title="Year 1+">
        <p>Long-term users graduate into coach mode: importing others' profiles, running programs, exporting reports. The app scales with expertise.</p>
      </Section>
    </DocPage>
  );
}
