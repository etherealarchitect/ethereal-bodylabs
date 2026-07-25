import { Link } from "@tanstack/react-router";
import { DocPage, Section, Callout } from "@/components/docs/DocPage";
import { findPart } from "@/lib/docs-manifest";

export default function ComponentLibraryDoc() {
  const part1 = findPart("part-1")!;
  const components = part1.pages.filter((p) => !["design-philosophy", "design-tokens", "component-library"].includes(p.slug));

  return (
    <DocPage
      eyebrow="Part 1 · Component Library"
      title="Component Library"
      summary="Every component in ETHEREAL BODYLABS ships with purpose, props, states, a11y, and tests."
      meta={{ owner: "Design", status: "Ready", version: "1.0.0", updated: "2026-07-24" }}
    >
      <Callout tone="info" title="Contract">
        Each component page documents: purpose · props · events · states (default / hover / focus /
        active / disabled / loading / error) · a11y notes · keyboard map · example code ·
        wireframe · interaction · animation · testing.
      </Callout>

      <Section title="Index">
        <ul className="grid gap-2 sm:grid-cols-2">
          {components.map((c) => (
            <li key={c.slug}>
              <Link
                to="/docs/$part/$slug"
                params={{ part: "part-1", slug: c.slug }}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 text-sm transition-colors hover:border-primary/50 hover:bg-surface-2"
              >
                <span className="font-medium">{c.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </DocPage>
  );
}
