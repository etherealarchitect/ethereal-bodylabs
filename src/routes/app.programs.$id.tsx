import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/app/AppShell";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/programs/$id")({
  component: ProgramDetail,
});

type Exercise = { name: string; sets: number; reps: string; rest_sec?: number; notes?: string };

function ProgramDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: program } = useQuery({
    queryKey: ["program", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: days } = useQuery({
    queryKey: ["program-days", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("program_days")
        .select("*").eq("program_id", id).order("day_index");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <Link to="/app/programs" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <ArrowLeft className="size-3.5" /> Programs
      </Link>
      <PageHeader eyebrow="Program" title={program?.name ?? "…"} />
      {program?.description && <p className="mb-4 text-sm text-muted-foreground">{program.description}</p>}

      <div className="space-y-3">
        {(days ?? []).map((d) => (
          <DayCard key={d.id} day={d} onChanged={() => qc.invalidateQueries({ queryKey: ["program-days", id] })} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ day, onChanged }: { day: any; onChanged: () => void }) {
  const [title, setTitle] = useState<string>(day.title ?? "");
  const [focus, setFocus] = useState<string>(day.focus ?? "");
  const [exs, setExs] = useState<Exercise[]>(Array.isArray(day.exercises) ? day.exercises : []);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("program_days").update({
        title, focus: focus || null, exercises: exs,
      }).eq("id", day.id);
    },
    onSuccess: () => { setDirty(false); onChanged(); },
  });

  const upd = (patch: Partial<Exercise>, i: number) => {
    setExs(exs.map((e, idx) => idx === i ? { ...e, ...patch } : e));
    setDirty(true);
  };

  return (
    <Card>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          placeholder="Day title"
          className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
        />
        <select
          value={focus}
          onChange={(e) => { setFocus(e.target.value); setDirty(true); }}
          className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Focus…</option>
          {["push", "pull", "legs", "upper", "lower", "full", "rest", "cardio"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {exs.map((ex, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_80px_28px] gap-1.5 items-center">
            <input
              value={ex.name}
              onChange={(e) => upd({ name: e.target.value }, i)}
              placeholder="Exercise"
              className="h-9 rounded-md border border-border/60 bg-surface-2 px-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={ex.sets}
              onChange={(e) => upd({ sets: Number(e.target.value) || 0 }, i)}
              inputMode="numeric" placeholder="Sets"
              className="h-9 rounded-md border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
            />
            <input
              value={ex.reps}
              onChange={(e) => upd({ reps: e.target.value }, i)}
              placeholder="Reps"
              className="h-9 rounded-md border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary"
            />
            <button
              onClick={() => { setExs(exs.filter((_, idx) => idx !== i)); setDirty(true); }}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => { setExs([...exs, { name: "", sets: 3, reps: "8-10" }]); setDirty(true); }}
          className="flex-1 h-9 rounded-lg border border-dashed border-border/60 text-xs inline-flex items-center justify-center gap-1 hover:border-primary"
        >
          <Plus className="size-3.5" /> Add exercise
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
        >
          {save.isPending ? "…" : "Save"}
        </button>
      </div>
    </Card>
  );
}
