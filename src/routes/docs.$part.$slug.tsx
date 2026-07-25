import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { DocShell } from "@/components/docs/DocShell";
import { AutoDocPage } from "@/components/docs/AutoDocPage";
import { findPage } from "@/lib/docs-manifest";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/docs/$part/$slug")({
  head: ({ params }) => {
    const match = findPage(params.part, params.slug);
    const title = match ? `${match.page.title} — ETHEREAL BODYLABS` : "Documentation";
    return {
      meta: [
        { title },
        { name: "description", content: match?.page.summary ?? "ETHEREAL BODYLABS documentation." },
        { property: "og:title", content: title },
        { property: "og:description", content: match?.page.summary ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const match = findPage(params.part, params.slug);
    if (!match) throw notFound();
    return match;
  },
  component: DocPageRoute,
  errorComponent: ({ error, reset }) => (
    <DocShell>
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="font-mono text-xs text-destructive">Error</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Couldn't load this document</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
        <button onClick={reset} className="mt-4 inline-block text-sm text-primary hover:underline">Retry</button>
      </div>
    </DocShell>
  ),
  notFoundComponent: () => (
    <DocShell>
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="font-mono text-xs text-muted-foreground">404</div>
        <h1 className="mt-2 font-display text-3xl font-semibold">Document not found</h1>
        <Link to="/docs" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to documentation
        </Link>
      </div>
    </DocShell>
  ),
});

function DocPageRoute() {
  const params = Route.useParams();
  const match = findPage(params.part, params.slug);
  if (!match) return null;
  const { part, page } = match;
  const Content = page.Content;

  const flatPages = part.pages;
  const idx = flatPages.findIndex((p) => p.slug === page.slug);
  const prev = idx > 0 ? flatPages[idx - 1] : undefined;
  const next = idx < flatPages.length - 1 ? flatPages[idx + 1] : undefined;

  return (
    <DocShell partSlug={part.slug} pageSlug={page.slug}>
      {Content ? <Content /> : <AutoDocPage part={part} page={page} />}

      <nav className="mx-auto mt-16 flex max-w-3xl items-center justify-between gap-4 border-t border-border/60 pt-6">
        {prev ? (
          <Link
            to="/docs/$part/$slug"
            params={{ part: part.slug, slug: prev.slug }}
            className="group flex flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <ArrowLeft className="size-3" /> Previous
            </span>
            <span className="mt-0.5 text-sm font-medium group-hover:text-primary">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/docs/$part/$slug"
            params={{ part: part.slug, slug: next.slug }}
            className="group flex flex-col items-end rounded-lg px-3 py-2 text-right transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Next <ArrowRight className="size-3" />
            </span>
            <span className="mt-0.5 text-sm font-medium group-hover:text-primary">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </DocShell>
  );
}

