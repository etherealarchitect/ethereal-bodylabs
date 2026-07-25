import { DocPage, Section } from "@/components/docs/DocPage";

export default function AchievementsDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Achievements"
      summary="Milestones that mean something."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Design rule">
        <p>Achievements are earned by consistency and progression, not by opening screens or tapping buttons.</p>
      </Section>
      <Section title="Presentation">
        <p>Full-bleed aurora reveal, haptic burst, then a permanent card in the profile.</p>
      </Section>
      <Section title="Anti-patterns">
        <p>No streaks-for-streaks-sake. If missing a day breaks the user's motivation more than it builds it, we soften the rule.</p>
      </Section>
    </DocPage>
  );
}
