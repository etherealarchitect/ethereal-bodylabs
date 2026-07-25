import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { SectionTabs, TRAIN_TABS } from "@/components/app/SectionTabs";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/records")({
  component: RecordsPage,
});

type SetRow = {
  exercise_name: string;
  reps: number | null;
  weight_kg: number | null;
  workout_id: string;
  workouts: { date: string } | null;
};

function RecordsPage() {
  const { user } = useAuth();

  const { data: sets } = useQuery({
    queryKey: ["records", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sets")
        .select("exercise_name,reps,weight_kg,workout_id,workouts(date)")
        .not("weight_kg", "is", null);
      if (error) throw error;
      return (data ?? []) as unknown as SetRow[];
    },
  });

  // Aggregate PRs: heaviest weight per exercise, best 1RM estimate (Epley).
  const prs = (() => {
    const map = new Map<
      string,
      {
        exercise: string;
        top_weight: number;
        top_reps: number;
        top_date: string | null;
        est_1rm: number;
        est_date: string | null;
      }
    >();
    for (const s of sets ?? []) {
      if (!s.weight_kg) continue;
      const key = s.exercise_name;
      const cur =
        map.get(key) ??
        {
          exercise: key,
          top_weight: 0,
          top_reps: 0,
          top_date: null,
          est_1rm: 0,
          est_date: null,
        };
      const reps = s.reps ?? 1;
      const w = Number(s.weight_kg);
      const est = w * (1 + reps / 30); // Epley
      if (w > cur.top_weight) {
        cur.top_weight = w;
        cur.top_reps = reps;
        cur.top_date = s.workouts?.date ?? null;
      }
      if (est > cur.est_1rm) {
        cur.est_1rm = est;
        cur.est_date = s.workouts?.date ?? null;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.est_1rm - a.est_1rm);
  })();

  return (
    <div>
      <PageHeader eyebrow="Train" title="Personal records" />
      <SectionTabs items={TRAIN_TABS} />

      {!prs.length ? (
        <EmptyState
          title="No PRs yet."
          hint="Log weighted sets in workouts and your bests show up here."
        />
      ) : (
        <div className="space-y-2">
          {prs.map((p) => (
            <Card key={p.exercise}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Trophy className="size-3.5 text-primary" />
                    {p.exercise}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Top set
                      </div>
                      <div className="mt-0.5 tabular-nums">
                        {p.top_weight} kg × {p.top_reps}
                      </div>
                      {p.top_date && (
                        <div className="text-[10px] text-muted-foreground">{p.top_date}</div>
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Est. 1RM
                      </div>
                      <div className="mt-0.5 tabular-nums">{p.est_1rm.toFixed(1)} kg</div>
                      {p.est_date && (
                        <div className="text-[10px] text-muted-foreground">{p.est_date}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
