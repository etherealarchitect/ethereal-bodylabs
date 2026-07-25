import { DocPage, Section, List } from "@/components/docs/DocPage";

export default function ExecSummaryDoc() {
  return (
    <DocPage
      eyebrow="Part 0 · Executive Summary"
      title="Executive Summary"
      summary="Why ETHEREAL BODYLABS exists, who it serves, and how it will be built."
      meta={{ owner: "Product", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Problem statement">
        <p>
          Serious lifters and self-experimenters juggle four to six single-purpose apps — a workout
          tracker, a macro logger, a habit checker, a photo album, a spreadsheet for measurements,
          and someone else's cloud holding all of it. None of them talk to each other, and none of
          them lets the user own the file.
        </p>
      </Section>
      <Section title="Market gap">
        <p>
          Existing solutions either lock users into a vendor cloud (MyFitnessPal, Strong, Hevy) or
          are open-source but fragmented and unmaintained. No mainstream product offers a unified,
          offline-first, encrypted, portable profile.
        </p>
      </Section>
      <Section title="Solution">
        <p>
          A single PWA that owns training, nutrition, protocols, and physique tracking, with all
          state serialized to a portable <code>.ebp</code> bundle the user can move, backup, or
          hand to a coach.
        </p>
      </Section>
      <Section title="Target audience">
        <List
          items={[
            "Data-driven lifters running structured programs (5/3/1, RP, custom).",
            "Self-experimenters tracking supplement or lifestyle protocols.",
            "Coaches who need a portable, structured way to review client data.",
            "Privacy-conscious users unwilling to hand their body data to ad networks.",
          ]}
        />
      </Section>
      <Section title="Competitive analysis">
        <List
          items={[
            "Strong / Hevy — strong logging, no nutrition, no physique, cloud-locked.",
            "MacroFactor — excellent nutrition, no training, no physique, cloud-locked.",
            "Notion/Sheets — infinitely flexible, zero structure, no analytics.",
          ]}
        />
      </Section>
      <Section title="Product principles">
        <List
          items={[
            "Offline is the default, not a fallback.",
            "The user owns the file.",
            "The AI summarizes; it does not diagnose.",
            "Nothing is logged that the user cannot delete.",
          ]}
        />
      </Section>
      <Section title="Business objectives">
        <List
          items={[
            "Ship v1.0 as a self-hostable PWA under a permissive licence.",
            "Optional paid Cloud sync tier for cross-device convenience.",
            "Never sell or share user data.",
          ]}
        />
      </Section>
      <Section title="Technology strategy">
        <p>
          TanStack Start on Cloudflare Workers (edge SSR) + client-side SQLite via wa-sqlite, with
          Lovable Cloud as the optional sync/auth layer.
        </p>
      </Section>
      <Section title="AI strategy">
        <p>
          Vision preprocessing runs client-side. Estimated body-fat and trend narratives call an
          opt-in cloud model with confidence intervals surfaced in the UI.
        </p>
      </Section>
      <Section title="Privacy strategy">
        <p>
          AES-GCM encryption on the <code>.ebp</code> bundle. Zero server-side plaintext. All
          telemetry is opt-in and aggregate.
        </p>
      </Section>
      <Section title="Offline strategy">
        <p>Full read/write while offline. Sync is best-effort with conflict resolution defined in Part 3.</p>
      </Section>
      <Section title="Success metrics">
        <List
          items={[
            "Time-to-first-log &lt; 60s from install.",
            "Weekly retention &gt; 60% at week 4.",
            "&lt; 1% sync conflict rate on real multi-device usage.",
          ]}
        />
      </Section>
      <Section title="Risk analysis">
        <List
          items={[
            "Photo pipeline complexity — mitigated by phased rollout in Part 9.",
            "Sync correctness — mitigated by CRDT-style merge, extensive testing (Part 14).",
            "AI misinterpretation — mitigated by confidence intervals and explicit disclaimers.",
          ]}
        />
      </Section>
    </DocPage>
  );
}
