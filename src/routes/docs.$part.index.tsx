import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DocShell } from "@/components/docs/DocShell";
import { findPart } from "@/lib/docs-manifest";

export const Route = createFileRoute("/docs/$part/")({
  head: ({ params }) => {
    const part = findPart(params.part);
    const title = part ? `${part.title} — ETHEREAL BODYLABS` : "Documentation";
    return {
      meta: [
        { title },
        { name: "description", content: part?.tagline ?? "ETHEREAL BODYLABS documentation." },
        { property: "og:title", content: title },
        { property: "og:description", content: part?.tagline ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const part = findPart(params.part);
    if (!part) throw notFound();
    return { part };
  },
  component: PartIndex,
  errorComponent: ({ error, reset }) => (
    <DocShell>
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="font-mono text-xs text-destructive">Error</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Couldn't load this part</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
        <button onClick={reset} className="mt-4 inline-block text-sm text-primary hover:underline">Retry</button>
      </div>
    </DocShell>
  ),
  notFoundComponent: () => (
    <DocShell>
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="font-mono text-xs text-muted-foreground">404</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Part not found</h1>
        <Link to="/docs" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to documentation
        </Link>
      </div>
    </DocShell>
  ),
});

function PartIndex() {
  const params = Route.useParams();
  const part = findPart(params.part);
  if (!part) return null;
  return (
    <DocShell partSlug={part.slug}>

      <div className="mx-auto max-w-3xl">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          Part {String(part.index).padStart(2, "0")}
        </div>
        <h1 className="font-display text-5xl font-semibold tracking-tight">{part.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{part.tagline}</p>

        <ul className="mt-10 space-y-2">
          {part.pages.map((page) => (
            <li key={page.slug}>
              <Link
                to="/docs/$part/$slug"
                params={{ part: part.slug, slug: page.slug }}
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-5 py-4 backdrop-blur transition-all hover:border-primary/50 hover:bg-card"
              >
                <div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {page.title}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{page.summary}</div>
                </div>
                <span
                  className={
                    "font-mono text-[10px] uppercase tracking-[0.16em] " +
                    (page.status === "ready"
                      ? "text-success"
                      : page.status === "drafting"
                        ? "text-warning"
                        : "text-muted-foreground")
                  }
                >
                  {page.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </DocShell>
  );
}
