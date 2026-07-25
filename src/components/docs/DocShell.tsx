import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DOC_PARTS, findPart } from "@/lib/docs-manifest";
import { cn } from "@/lib/utils";
import { BookOpenText, Sparkles, Home, ChevronRight } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";


type Props = {
  partSlug?: string;
  pageSlug?: string;
  children: ReactNode;
};

export function DocShell({ partSlug, pageSlug, children }: Props) {
  const activePart = partSlug ? findPart(partSlug) : undefined;
  return (
    <AdminGate>
      <DocShellInner partSlug={partSlug} pageSlug={pageSlug} activePart={activePart}>
        {children}
      </DocShellInner>
    </AdminGate>
  );
}

function DocShellInner({
  partSlug,
  pageSlug,
  activePart,
  children,
}: Props & { activePart: ReturnType<typeof findPart> }) {


  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="mx-auto flex max-w-[1500px] gap-0">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 overflow-y-auto border-r border-border/60 bg-sidebar/40 px-4 py-6 lg:block">
          <SidebarNav activePart={partSlug} activePage={pageSlug} />
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
          {activePart && (
            <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/docs" className="hover:text-foreground">Docs</Link>
              <ChevronRight className="size-3" />
              <Link
                to="/docs/$part"
                params={{ part: activePart.slug }}
                className="hover:text-foreground"
              >
                {activePart.title}
              </Link>
              {pageSlug && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground">
                    {activePart.pages.find((p) => p.slug === pageSlug)?.title}
                  </span>
                </>
              )}
            </nav>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-6 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md aurora-bg text-primary-foreground shadow-glow">
            <Sparkles className="size-3.5" />
          </span>
          ETHEREAL BODYLABS
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
            activeOptions={{ exact: true }}
          >
            <Home className="size-3.5" /> Home
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            <BookOpenText className="size-3.5" /> Docs
          </Link>
          <Link
            to="/design"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            <Sparkles className="size-3.5" /> Design
          </Link>
        </nav>
      </div>
    </header>
  );
}

function SidebarNav({
  activePart,
  activePage,
}: {
  activePart?: string;
  activePage?: string;
}) {
  return (
    <nav className="space-y-6 text-sm">
      <div>
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Overview
        </div>
        <Link
          to="/docs"
          className="block rounded-md px-2 py-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          activeProps={{ className: "bg-sidebar-accent text-foreground font-medium" }}
          activeOptions={{ exact: true }}
        >
          Documentation home
        </Link>
      </div>
      {DOC_PARTS.map((part) => {
        const isActive = part.slug === activePart;
        return (
          <div key={part.slug}>
            <Link
              to="/docs/$part"
              params={{ part: part.slug }}
              className={cn(
                "flex items-baseline gap-2 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-mono">Part {part.index}</span>
              <span className="normal-case tracking-normal text-[13px] font-medium text-foreground/90">
                {part.title}
              </span>
            </Link>
            <ul className="mt-1 space-y-0.5 border-l border-border/60 pl-2">
              {part.pages.map((page) => {
                const isPageActive = isActive && page.slug === activePage;
                return (
                  <li key={page.slug}>
                    <Link
                      to="/docs/$part/$slug"
                      params={{ part: part.slug, slug: page.slug }}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2 py-1 text-[13px] transition-colors",
                        isPageActive
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                      )}
                    >
                      <span className="truncate">{page.title}</span>
                      <StatusDot status={page.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function StatusDot({ status }: { status: "ready" | "drafting" | "planned" }) {
  const color =
    status === "ready" ? "bg-success" : status === "drafting" ? "bg-warning" : "bg-muted-foreground/40";
  return <span className={cn("ml-2 size-1.5 shrink-0 rounded-full", color)} aria-hidden />;
}
