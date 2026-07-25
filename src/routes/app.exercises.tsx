import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { SectionTabs, TRAIN_TABS } from "@/components/app/SectionTabs";
import { Plus, Trash2, Sparkles, Search, Loader2, BookOpen, X } from "lucide-react";
import { generateTrainingPlan, lookupExercise } from "@/lib/training.functions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/app/exercises")({
  component: ExercisesPage,
});

const GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core", "cardio", "mobility"];

function ExercisesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [showPlan, setShowPlan] = useState(false);
  const [showLookup, setShowLookup] = useState(false);

  const { data: exercises } = useQuery({
    queryKey: ["exercises", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user || !name.trim()) return;
      const { error } = await supabase.from("exercises").insert({
        user_id: user.id,
        name: name.trim(),
        muscle_group: group || null,
        equipment: equipment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      setName(""); setGroup(""); setEquipment("");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("exercises").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });

  const grouped = (exercises ?? []).reduce<Record<string, typeof exercises>>((acc, e) => {
    const k = e.muscle_group ?? "other";
    (acc[k] ||= [] as any).push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader eyebrow="Train" title="Exercise library" />
      <SectionTabs items={TRAIN_TABS} />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setShowPlan(true)}
          className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 text-left"
        >
          <Sparkles className="size-4 text-primary mb-1.5" />
          <div className="text-sm font-semibold leading-tight">Build my training plan</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">AI writes your weekly split</div>
        </button>
        <button
          onClick={() => setShowLookup(true)}
          className="group rounded-2xl border border-border/60 bg-surface-2 p-3 text-left"
        >
          <BookOpen className="size-4 text-primary mb-1.5" />
          <div className="text-sm font-semibold leading-tight">Exercise lookup</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Form, cues & diagram</div>
        </button>
      </div>

      <Card className="mb-4">
        <div className="space-y-2.5">
          <input
            placeholder="Exercise name (e.g. Barbell Bench Press)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm outline-none focus:border-primary">
              <option value="">Muscle group…</option>
              {GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
            <input placeholder="Equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)}
              className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm outline-none focus:border-primary" />
            <button onClick={() => add.mutate()} disabled={!name || add.isPending}
              className="h-10 rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium disabled:opacity-50">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </Card>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState title="No exercises yet." hint="Build your library once, then autofill workouts." />
      ) : (
        Object.entries(grouped).map(([g, list]) => (
          <div key={g} className="mb-4">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">{g}</div>
            <div className="space-y-1.5">
              {list!.map((e) => (
                <Card key={e.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{e.name}</div>
                      {e.equipment && (
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{e.equipment}</div>
                      )}
                    </div>
                    <button onClick={() => del.mutate(e.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {showPlan && <PlanBuilderModal onClose={() => setShowPlan(false)} />}
      {showLookup && <LookupModal onClose={() => setShowLookup(false)} />}
    </div>
  );
}

/* ---------------- Plan builder modal ---------------- */

function PlanBuilderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [goal, setGoal] = useState("Build muscle and get lean");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [experience, setExperience] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [equipment, setEquipment] = useState("full commercial gym");
  const [focus, setFocus] = useState("");
  const [weeks, setWeeks] = useState(4);

  const gen = useMutation({
    mutationFn: async () => generateTrainingPlan({ data: { goal, daysPerWeek, sessionMinutes, experience, equipment, focus: focus || undefined, weeks } }),
    onSuccess: (res) => {
      toast.success(`Created "${res.name}" — ${res.dayCount} days`);
      qc.invalidateQueries({ queryKey: ["programs"] });
      qc.invalidateQueries({ queryKey: ["exercises"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to build plan"),
  });

  return (
    <ModalShell title="Build my training plan" subtitle="AI writes a full weekly plan and adds every exercise to your library" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Your goal">
          <input value={goal} onChange={(e) => setGoal(e.target.value)} className="modal-input" placeholder="e.g. Lose fat while keeping strength" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Days / week">
            <select value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} className="modal-input">
              {[2, 3, 4, 5, 6].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </Field>
          <Field label="Session minutes">
            <select value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))} className="modal-input">
              {[30, 45, 60, 75, 90, 120].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Experience">
            <select value={experience} onChange={(e) => setExperience(e.target.value as any)} className="modal-input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Program length">
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="modal-input">
              {[3, 4, 6, 8, 12].map((n) => (<option key={n} value={n}>{n} weeks</option>))}
            </select>
          </Field>
        </div>
        <Field label="Equipment available">
          <input value={equipment} onChange={(e) => setEquipment(e.target.value)} className="modal-input" placeholder="full gym / dumbbells only / home rack + bands" />
        </Field>
        <Field label="Anything to prioritise (optional)">
          <input value={focus} onChange={(e) => setFocus(e.target.value)} className="modal-input" placeholder="e.g. bigger arms, protect lower back" />
        </Field>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border/60 bg-background text-sm font-medium">Cancel</button>
        <button
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {gen.isPending ? (<><Loader2 className="size-4 animate-spin" /> Writing…</>) : (<><Sparkles className="size-4" /> Generate</>)}
        </button>
      </div>
      {gen.isSuccess && (
        <div className="mt-3 text-[11px] text-muted-foreground text-center">
          <Link to="/app/programs" className="underline underline-offset-2">Open programs →</Link>
        </div>
      )}
    </ModalShell>
  );
}

/* ---------------- Lookup modal ---------------- */

function LookupModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const lookup = useMutation({
    mutationFn: async (name: string) => lookupExercise({ data: { name, includeImage: true } }),
    onError: (e: any) => toast.error(e?.message ?? "Lookup failed"),
  });

  const submit = () => {
    const v = q.trim();
    if (!v) return;
    setSubmitted(v);
    lookup.mutate(v);
  };

  const suggestions = ["Barbell Back Squat", "Romanian Deadlift", "Bulgarian Split Squat", "Bench Press", "Pull-up", "Overhead Press", "Barbell Row"];

  return (
    <ModalShell title="Exercise lookup" subtitle="Search any lift for form, cues and a diagram" onClose={onClose}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search an exercise…"
            className="modal-input pl-9"
          />
        </div>
        <button onClick={submit} disabled={!q.trim() || lookup.isPending}
          className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
          Look up
        </button>
      </div>

      {!submitted && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => { setQ(s); setSubmitted(s); lookup.mutate(s); }}
              className="text-[11px] px-2 py-1 rounded-full border border-border/60 bg-surface-2 hover:border-primary">
              {s}
            </button>
          ))}
        </div>
      )}

      {lookup.isPending && (
        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          Looking up form and generating diagram…
        </div>
      )}

      {lookup.data && (
        <div className="mt-4 space-y-3">
          {lookup.data.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-border/60 bg-surface-2">
              <img src={lookup.data.imageUrl} alt={submitted ?? "exercise"} className="w-full h-auto" />
            </div>
          )}
          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-sm prose-h2:mt-3 prose-h2:mb-1 prose-p:my-1 prose-ul:my-1">
            <ReactMarkdown>{lookup.data.instructions || "_No details returned._"}</ReactMarkdown>
          </div>
          <p className="text-[10px] text-muted-foreground/80">
            Educational content — not a substitute for coaching or medical advice.
          </p>
        </div>
      )}
    </ModalShell>
  );
}

/* ---------------- shared modal chrome ---------------- */

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-background border border-border/60 shadow-2xl p-5"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-semibold">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1 -mr-1 text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
      <style>{`.modal-input{height:2.75rem;width:100%;border-radius:0.75rem;border:1px solid color-mix(in oklab,var(--border) 60%,transparent);background:var(--surface-2);padding:0 0.75rem;font-size:0.875rem;outline:none}.modal-input:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      {children}
    </label>
  );
}
