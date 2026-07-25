import { DocPage, Section } from "@/components/docs/DocPage";

export default function ErrorStatesDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Error States"
      summary="Fail loud enough to fix, quiet enough to keep working."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Classification">
        <p>Recoverable (retry), user-fixable (validation), system (report), and terminal (fatal). Each has its own visual language.</p>
      </Section>
      <Section title="Placement">
        <p>Inline for field errors, toast for transient issues, full-screen only for terminal states.</p>
      </Section>
      <Section title="Copy rules">
        <p>Say what happened, why, and what to do. Never blame the user; never blame the network without a retry.</p>
      </Section>
    </DocPage>
  );
}
