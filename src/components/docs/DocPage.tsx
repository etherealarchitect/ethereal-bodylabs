import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DocPage({
  eyebrow,
  title,
  summary,
  meta,
  children,
}: {
  eyebrow?: string;
  title: string;
  summary?: string;
  meta?: { owner?: string; status?: string; version?: string; updated?: string };
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-10 border-b border-border/60 pb-8">
        {eyebrow && (
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {summary && (
          <p className="mt-4 text-lg text-muted-foreground">{summary}</p>
        )}
        {meta && (
          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {meta.owner && <MetaItem label="Owner" value={meta.owner} />}
            {meta.status && <MetaItem label="Status" value={meta.status} />}
            {meta.version && <MetaItem label="Version" value={meta.version} />}
            {meta.updated && <MetaItem label="Updated" value={meta.updated} />}
          </dl>
        )}
      </header>
      <div className="prose-doc space-y-6">{children}</div>
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground/70">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-10 mb-4 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const toneClass = {
    info: "border-info/40 bg-info/10 text-foreground",
    success: "border-success/40 bg-success/10 text-foreground",
    warning: "border-warning/40 bg-warning/10 text-foreground",
    danger: "border-destructive/40 bg-destructive/10 text-foreground",
  }[tone];
  return (
    <aside className={cn("rounded-xl border p-4 text-sm", toneClass)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-foreground/85">{children}</div>
    </aside>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-[15px] text-foreground/85 marker:text-primary/70">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function PropTable({
  rows,
}: {
  rows: { name: string; type: string; description: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Prop</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => (
            <tr key={r.name} className="align-top">
              <td className="px-4 py-2.5 font-mono text-[13px] text-primary">{r.name}</td>
              <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">{r.type}</td>
              <td className="px-4 py-2.5 text-foreground/85">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TemplateScaffold({
  status,
}: {
  status: "drafting" | "planned";
}) {
  const isPlanned = status === "planned";
  return (
    <>
      <Callout tone={isPlanned ? "info" : "warning"} title={isPlanned ? "Planned" : "Drafting"}>
        {isPlanned
          ? "This document is scheduled for a later milestone. The template outline below shows what will be authored."
          : "This document is being drafted. Sections below are placeholders and will fill in as the milestone completes."}
      </Callout>
      {[
        "Executive summary",
        "Scope",
        "Functional requirements",
        "Non-functional requirements",
        "User stories",
        "Acceptance criteria",
        "Edge cases",
        "Error handling",
        "Data model references",
        "API references",
        "UI specifications",
        "Accessibility requirements",
        "Security considerations",
        "Test cases",
        "Future roadmap",
        "Change history",
      ].map((section) => (
        <Section key={section} title={section}>
          <p className="text-muted-foreground italic">To be authored.</p>
        </Section>
      ))}
    </>
  );
}
