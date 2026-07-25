import { createFileRoute, Link } from "@tanstack/react-router";
import { DocShell } from "@/components/docs/DocShell";
import { DOC_PARTS, totalPages, readyPages } from "@/lib/docs-manifest";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Documentation — ETHEREAL BODYLABS" },
      { name: "description", content: "The complete 18-part ESAS index for ETHEREAL BODYLABS." },
      { property: "og:title", content: "ETHEREAL BODYLABS Documentation" },
      { property: "og:description", content: "Browse the 180-document specification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsHome,
});

function DocsHome() {
  const total = totalPages();
  const ready = readyPages();

  return (
    <DocShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          Documentation · v1.0
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight">
          The complete specification.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Eighteen parts, {total} documents. Green dots are authored; amber are drafting; grey are
          planned for a later milestone.
        </p>

        <div className="mt-8 flex gap-4">
          <MiniStat label="Total" value={`${total}`} />
          <MiniStat label="Ready" value={`${ready}`} accent />
          <MiniStat label="Parts" value="18" />
        </div>

        <div className="mt-12 space-y-6">
          {DOC_PARTS.map((part) => (
            <section
              key={part.slug}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur"
            >
              <div className="flex items-baseline justify-between">
                <Link
                  to="/docs/$part"
                  params={{ part: part.slug }}
                  className="group"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Part {String(part.index).padStart(2, "0")}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                    {part.title}
                  </h2>
                </Link>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {part.pages.length} docs
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{part.tagline}</p>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {part.pages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      to="/docs/$part/$slug"
                      params={{ part: part.slug, slug: page.slug }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-surface-1/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-surface-2 hover:text-foreground"
                    >
                      <span
                        className={
                          "size-1.5 rounded-full " +
                          (page.status === "ready"
                            ? "bg-success"
                            : page.status === "drafting"
                              ? "bg-warning"
                              : "bg-muted-foreground/40")
                        }
                        aria-hidden
                      />
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </DocShell>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-1/50 px-4 py-3">
      <div className={"font-display text-2xl font-semibold " + (accent ? "aurora-text" : "text-foreground")}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
    </div>
  );
}
