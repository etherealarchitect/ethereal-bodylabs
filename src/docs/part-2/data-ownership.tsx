import { DocPage, Section } from "@/components/docs/DocPage";

export default function DataOwnershipDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Data Ownership"
      summary="The user owns everything, always."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Portability">
        <p>Every byte the app stores can be exported as an .ebp file at any time, offline.</p>
      </Section>
      <Section title="Deletion">
        <p>Deleting the app deletes the data. No shadow copies, no dark syncs.</p>
      </Section>
      <Section title="Transparency">
        <p>Settings → Data shows exactly what is stored, where, and how large it is.</p>
      </Section>
    </DocPage>
  );
}
