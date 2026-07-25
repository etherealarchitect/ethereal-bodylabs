import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/nutrition")({
  component: NutritionPage,
});

function NutritionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "" });

  const { data: meals } = useQuery({
    queryKey: ["meals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("meals")
        .select("*").order("eaten_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totals = (meals ?? []).reduce((a, m) => {
    const today = new Date().toISOString().slice(0, 10);
    if (m.eaten_at.slice(0, 10) !== today) return a;
    return {
      kcal: a.kcal + (m.kcal ?? 0),
      p: a.p + Number(m.protein_g ?? 0),
      c: a.c + Number(m.carbs_g ?? 0),
      f: a.f + Number(m.fat_g ?? 0),
    };
  }, { kcal: 0, p: 0, c: 0, f: 0 });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const { error } = await supabase.from("meals").insert({
        user_id: user.id, name: f.name,
        kcal: f.kcal ? Number(f.kcal) : null,
        protein_g: f.protein_g ? Number(f.protein_g) : null,
        carbs_g: f.carbs_g ? Number(f.carbs_g) : null,
        fat_g: f.fat_g ? Number(f.fat_g) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      setOpen(false); setF({ name: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "" });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("meals").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals"] }),
  });

  return (
    <div>
      <PageHeader eyebrow="Fuel" title="Nutrition"
        action={<button onClick={() => setOpen(!open)} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1"><Plus className="size-3.5" /> Log</button>} />

      <Card className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today</div>
        <div className="mt-2 flex justify-between">
          <Metric label="kcal" value={totals.kcal} />
          <Metric label="P" value={Math.round(totals.p)} />
          <Metric label="C" value={Math.round(totals.c)} />
          <Metric label="F" value={Math.round(totals.f)} />
        </div>
      </Card>

      {open && (
        <Card className="mb-4">
          <div className="space-y-2.5">
            <input placeholder="Meal name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })}
              className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary" />
            <div className="grid grid-cols-4 gap-2">
              {(["kcal", "protein_g", "carbs_g", "fat_g"] as const).map((k) => (
                <input key={k} placeholder={k === "kcal" ? "kcal" : k[0].toUpperCase()} inputMode="decimal"
                  value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
                  className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary" />
              ))}
            </div>
            <button disabled={create.isPending || !f.name} onClick={() => create.mutate()}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {create.isPending ? "…" : "Save meal"}
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {!meals?.length ? (
          <EmptyState title="Nothing logged yet." hint="Tap Log to add your first meal." />
        ) : meals.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-muted-foreground">{new Date(m.eaten_at).toLocaleString()}</div>
                <div className="mt-0.5 font-medium truncate">{m.name}</div>
                <div className="mt-1 text-xs text-muted-foreground font-mono">
                  {m.kcal ?? "—"} kcal · P{m.protein_g ?? "—"} C{m.carbs_g ?? "—"} F{m.fat_g ?? "—"}
                </div>
              </div>
              <button onClick={() => del.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="size-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
    </div>
  );
}
