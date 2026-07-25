import { Link, useRouterState } from "@tanstack/react-router";

export function SectionTabs({
  items,
}: {
  items: { to: string; label: string }[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mb-5 flex gap-1 rounded-xl border border-border/60 bg-surface-1/70 p-1">
      {items.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to as any}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

export const TRAIN_TABS = [
  { to: "/app/workouts", label: "Sessions" },
  { to: "/app/exercises", label: "Library" },
  { to: "/app/records", label: "PRs" },
];

export const LAB_TABS = [
  { to: "/app/physique", label: "Physique" },
  { to: "/app/insights", label: "Insights" },
  { to: "/app/bloodwork", label: "Bloods" },
];
