import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { SectionTabs, TRAIN_TABS } from "@/components/app/SectionTabs";
import { Plus, Trash2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/workouts")({
  component: WorkoutsPage,
});

type SetRow = { exercise_name: string; reps: string; weight_kg: string; rpe: string };

function WorkoutsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [sets, setSets] = useState<SetRow[]>([{ exercise_name: "", reps: "", weight_kg: "", rpe: "" }]);

  const { data: workouts } = useQuery({
    queryKey: ["workouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id,date,title,duration_min,workout_sets(id,exercise_name,reps,weight_kg,rpe,position)")
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["exercises-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("name").order("name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data: w, error } = await supabase
        .from("workouts")
        .insert({ user_id: user.id, title: title || null, duration_min: duration ? Number(duration) : null })
        .select()
        .single();
      if (error) throw error;
      const clean = sets.filter((s) => s.exercise_name.trim());
      if (clean.length) {
        const rows = clean.map((s, i) => ({
          user_id: user.id,
          workout_id: w.id,
          exercise_name: s.exercise_name,
          reps: s.reps ? Number(s.reps) : null,
          weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
          rpe: s.rpe ? Number(s.rpe) : null,
          position: i,
        }));
        const { error: e2 } = await supabase.from("workout_sets").insert(rows);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["records"] });
      setOpen(false);
      setTitle("");
      setDuration("");
      setSets([{ exercise_name: "", reps: "", weight_kg: "", rpe: "" }]);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workouts").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Train"
        title="Sessions"
        action={
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1"
          >
            <Plus className="size-3.5" /> New
          </button>
        }
      />
      <SectionTabs items={TRAIN_TABS} />

      {open && (
        <Card className="mb-4">
          <div className="space-y-2.5">
            <input
              placeholder="Session title (e.g. Push Day)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
            />
            <input
              placeholder="Duration (min)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputMode="numeric"
              className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
            />
            <datalist id="ex-names">
              {(exercises ?? []).map((e) => (
                <option key={e.name} value={e.name} />
              ))}
            </datalist>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground pt-2">
              Sets
            </div>
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_70px_50px_24px] gap-1.5 items-center">
                <input
                  list="ex-names"
                  placeholder="Exercise"
                  value={s.exercise_name}
                  onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, exercise_name: e.target.value } : x)))}
                  className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2.5 text-sm outline-none focus:border-primary"
                />
                <input
                  placeholder="reps"
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
                  className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
                />
                <input
                  placeholder="kg"
                  inputMode="decimal"
                  value={s.weight_kg}
                  onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, weight_kg: e.target.value } : x)))}
                  className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
                />
                <input
                  placeholder="rpe"
                  inputMode="decimal"
                  value={s.rpe}
                  onChange={(e) => setSets(sets.map((x, j) => (j === i ? { ...x, rpe: e.target.value } : x)))}
                  className="h-9 rounded-lg border border-border/60 bg-surface-2 px-1.5 text-sm text-center outline-none focus:border-primary"
                />
                <button
                  onClick={() => setSets(sets.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setSets([...sets, { exercise_name: "", reps: "", weight_kg: "", rpe: "" }])}
              className="w-full h-9 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + Add set
            </button>
            <button
              disabled={create.isPending}
              onClick={() => create.mutate()}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Save workout"}
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {!workouts?.length ? (
          <EmptyState title="No workouts yet." hint="Tap New to log your first session." />
        ) : (
          workouts.map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-2">
                <Link to="/app/workouts/$id" params={{ id: w.id }} className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-muted-foreground">{w.date}</div>
                  <div className="mt-0.5 font-medium truncate">{w.title ?? "Session"}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.workout_sets?.length ?? 0} sets · {w.duration_min ?? "—"} min
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => del.mutate(w.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <Link
                    to="/app/workouts/$id"
                    params={{ id: w.id }}
                    className="text-muted-foreground p-1"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
              {w.workout_sets && w.workout_sets.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-foreground/80">
                  {w.workout_sets
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .slice(0, 5)
                    .map((s) => (
                      <li key={s.id} className="flex justify-between border-t border-border/40 pt-1.5">
                        <span>{s.exercise_name}</span>
                        <span className="font-mono">
                          {s.reps ?? "—"}×{s.weight_kg ?? "—"}kg {s.rpe ? `· RPE ${s.rpe}` : ""}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
