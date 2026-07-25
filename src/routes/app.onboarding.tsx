import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader } from "@/components/app/AppShell";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

type Form = {
  display_name: string;
  sex: "male" | "female" | "other" | "";
  birth_year: string;
  height_cm: string;
  starting_weight_kg: string;
  target_weight_kg: string;
  goal: "recomp" | "cut" | "bulk" | "perform" | "longevity" | "";
  activity_level: "sedentary" | "light" | "moderate" | "high" | "athlete" | "";
  training_days_per_week: string;
  units: "metric" | "imperial";
};

const DEFAULT: Form = {
  display_name: "", sex: "", birth_year: "", height_cm: "",
  starting_weight_kg: "", target_weight_kg: "", goal: "", activity_level: "",
  training_days_per_week: "4", units: "metric",
};

function mifflin({ sex, weight, height, age }: { sex: string; weight: number; height: number; age: number }) {
  const s = sex === "female" ? -161 : 5;
  return Math.round(10 * weight + 6.25 * height - 5 * age + s);
}
const ACT_MULT: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, athlete: 1.9,
};
const GOAL_ADJ: Record<string, number> = { cut: -0.2, recomp: -0.05, perform: 0, longevity: 0, bulk: 0.12 };

function Onboarding() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(DEFAULT);
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch });

  const yearNow = new Date().getFullYear();
  const age = f.birth_year ? yearNow - Number(f.birth_year) : 30;
  const bmr = f.height_cm && f.starting_weight_kg && f.birth_year && f.sex
    ? mifflin({ sex: f.sex, weight: Number(f.starting_weight_kg), height: Number(f.height_cm), age })
    : null;
  const tdee = bmr && f.activity_level ? Math.round(bmr * (ACT_MULT[f.activity_level] ?? 1.4)) : null;
  const kcalTarget = tdee && f.goal ? Math.round(tdee * (1 + (GOAL_ADJ[f.goal] ?? 0))) : null;
  const proteinTarget = f.starting_weight_kg
    ? Math.round(Number(f.starting_weight_kg) * (f.goal === "cut" ? 2.2 : 1.8))
    : null;

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const { error } = await supabase.from("profiles").update({
        display_name: f.display_name || null,
        sex: f.sex || null,
        birth_year: f.birth_year ? Number(f.birth_year) : null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        starting_weight_kg: f.starting_weight_kg ? Number(f.starting_weight_kg) : null,
        target_weight_kg: f.target_weight_kg ? Number(f.target_weight_kg) : null,
        goal: f.goal || null,
        activity_level: f.activity_level || null,
        training_days_per_week: f.training_days_per_week ? Number(f.training_days_per_week) : null,
        units: f.units,
        kcal_target: kcalTarget,
        protein_target_g: proteinTarget,
        onboarding_complete: true,
      }).eq("id", user.id);
      if (error) throw error;
      if (f.starting_weight_kg) {
        await supabase.from("measurements").insert({
          user_id: user.id, weight_kg: Number(f.starting_weight_kg),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      nav({ to: "/app" });
    },
  });

  const steps = [
    {
      title: "Welcome",
      valid: !!f.display_name,
      body: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A quick 6-step setup. You can change everything later.
          </p>
          <Input label="What should we call you?" value={f.display_name} onChange={(v) => set({ display_name: v })} />
          <Segment label="Units" options={["metric", "imperial"]} value={f.units} onChange={(v) => set({ units: v as any })} />
        </div>
      ),
    },
    {
      title: "About you",
      valid: !!f.sex && !!f.birth_year,
      body: (
        <div className="space-y-3">
          <Segment label="Sex" options={["male", "female", "other"]} value={f.sex} onChange={(v) => set({ sex: v as any })} />
          <Input label="Birth year" value={f.birth_year} onChange={(v) => set({ birth_year: v })} type="number" />
        </div>
      ),
    },
    {
      title: "Body",
      valid: !!f.height_cm && !!f.starting_weight_kg,
      body: (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Height (cm)" value={f.height_cm} onChange={(v) => set({ height_cm: v })} type="number" />
          <Input label="Weight now (kg)" value={f.starting_weight_kg} onChange={(v) => set({ starting_weight_kg: v })} type="number" />
          <Input label="Target weight (kg)" value={f.target_weight_kg} onChange={(v) => set({ target_weight_kg: v })} type="number" />
        </div>
      ),
    },
    {
      title: "Goal",
      valid: !!f.goal,
      body: (
        <div className="grid grid-cols-1 gap-2">
          {(["recomp", "cut", "bulk", "perform", "longevity"] as const).map((g) => (
            <button
              key={g}
              onClick={() => set({ goal: g })}
              className={`h-12 rounded-xl border text-sm capitalize text-left px-4 ${
                f.goal === g ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface-2"
              }`}
            >
              {g === "recomp" ? "Body recomposition" : g}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Activity",
      valid: !!f.activity_level && !!f.training_days_per_week,
      body: (
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Activity</div>
            <div className="grid grid-cols-1 gap-2">
              {(["sedentary", "light", "moderate", "high", "athlete"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => set({ activity_level: a })}
                  className={`h-11 rounded-xl border text-sm capitalize text-left px-4 ${
                    f.activity_level === a ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface-2"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Input label="Training days per week" value={f.training_days_per_week} onChange={(v) => set({ training_days_per_week: v })} type="number" />
        </div>
      ),
    },
    {
      title: "Your plan",
      valid: true,
      body: (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-surface-2 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Suggested daily targets</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Stat label="kcal" value={kcalTarget ? String(kcalTarget) : "—"} />
              <Stat label="protein g" value={proteinTarget ? String(proteinTarget) : "—"} />
            </div>
            {bmr && <div className="mt-2 text-xs text-muted-foreground font-mono">BMR {bmr} · TDEE {tdee}</div>}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on Mifflin-St Jeor + activity factor. Adjust anytime in Settings.
          </p>
        </div>
      ),
    },
  ];

  const s = steps[step];

  return (
    <div>
      <PageHeader eyebrow={`Step ${step + 1} of ${steps.length}`} title={s.title} />
      <div className="mb-4 h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <Card>{s.body}</Card>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="h-11 flex-1 rounded-xl border border-border/60 bg-surface-2 text-sm inline-flex items-center justify-center gap-1 disabled:opacity-40"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!s.valid}
            className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-40"
          >
            Next <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Check className="size-4" /> {save.isPending ? "Saving…" : "Enter Bodylab"}
          </button>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
function Segment({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`h-11 rounded-lg border text-sm capitalize ${
              value === o ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface-2"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
    </div>
  );
}
