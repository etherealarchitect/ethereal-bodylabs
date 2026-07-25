import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader } from "@/components/app/AppShell";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/workouts/$id")({
  component: WorkoutDetail,
});

type Set = {
  id?: string;
  exercise_name: string;
  reps: string;
  weight_kg: string;
  rpe: string;
  position: number;
};

function WorkoutDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<Set[]>([]);

  const { data } = useQuery({
    queryKey: ["workout", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*,workout_sets(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setTitle(data.title ?? "");
    setDuration(data.duration_min?.toString() ?? "");
    setNotes(data.notes ?? "");
    setSets(
      (data.workout_sets ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position)
        .map((s: any) => ({
          id: s.id,
          exercise_name: s.exercise_name,
          reps: s.reps?.toString() ?? "",
          weight_kg: s.weight_kg?.toString() ?? "",
          rpe: s.rpe?.toString() ?? "",
          position: s.position,
        })),
    );
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("workouts")
        .update({
          title: title || null,
          duration_min: duration ? Number(duration) : null,
          notes: notes || null,
        })
        .eq("id", id);
      // Replace sets: delete then insert (simple + correct for MVP).
      await supabase.from("workout_sets").delete().eq("workout_id", id);
      const clean = sets.filter((s) => s.exercise_name.trim());
      if (clean.length) {
        await supabase.from("workout_sets").insert(
          clean.map((s, i) => ({
            user_id: user.id,
            workout_id: id,
            exercise_name: s.exercise_name,
            reps: s.reps ? Number(s.reps) : null,
            weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
            rpe: s.rpe ? Number(s.rpe) : null,
            position: i,
          })),
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      qc.invalidateQueries({ queryKey: ["workout", id] });
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await supabase.from("workouts").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workouts"] });
      navigate({ to: "/app/workouts" });
    },
  });

  return (
    <div>
      <Link
        to="/app/workouts"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Sessions
      </Link>
      <PageHeader
        eyebrow={data?.date ?? "Session"}
        title="Edit workout"
        action={
          <button
            onClick={() => remove.mutate()}
            className="rounded-lg border border-destructive/40 text-destructive px-3 py-1.5 text-xs"
          >
            <Trash2 className="inline size-3.5" />
          </button>
        }
      />

      <Card>
        <div className="space-y-2.5">
          <input
            placeholder="Title"
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
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border/60 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
          />

          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground pt-2">
            Sets
          </div>
          {sets.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_60px_70px_50px_24px] gap-1.5 items-center"
            >
              <input
                placeholder="Exercise"
                value={s.exercise_name}
                onChange={(e) =>
                  setSets(
                    sets.map((x, j) => (j === i ? { ...x, exercise_name: e.target.value } : x)),
                  )
                }
                className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="reps"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) =>
                  setSets(sets.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))
                }
                className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
              />
              <input
                placeholder="kg"
                inputMode="decimal"
                value={s.weight_kg}
                onChange={(e) =>
                  setSets(sets.map((x, j) => (j === i ? { ...x, weight_kg: e.target.value } : x)))
                }
                className="h-9 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
              />
              <input
                placeholder="rpe"
                inputMode="decimal"
                value={s.rpe}
                onChange={(e) =>
                  setSets(sets.map((x, j) => (j === i ? { ...x, rpe: e.target.value } : x)))
                }
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
            onClick={() =>
              setSets([
                ...sets,
                { exercise_name: "", reps: "", weight_kg: "", rpe: "", position: sets.length },
              ])
            }
            className="w-full h-9 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="inline size-3.5 mr-1" /> Add set
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <Save className="inline size-4 mr-1" /> {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </Card>
    </div>
  );
}
