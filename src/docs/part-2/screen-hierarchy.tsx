import { DocPage, Section } from "@/components/docs/DocPage";

export default function ScreenHierarchyDoc() {
  return (
    <DocPage
      eyebrow="Part 2 · UX Documentation"
      title="Screen Hierarchy"
      summary="Titles, chrome, density levels."
      meta={{ owner: "UX", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Section title="Title system">
        <p>Screen title left, context action right. No centered titles; they read as marketing, not navigation.</p>
      </Section>
      <Section title="Density">
        <p>Comfortable by default. Compact mode reduces vertical spacing by 20% for data-heavy screens like analytics.</p>
      </Section>
      <Section title="Chrome">
        <p>Bars are translucent glass over the aurora background; content scrolls beneath.</p>
      </Section>
    </DocPage>
  );
}
