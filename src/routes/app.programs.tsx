import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { Plus, Star, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/programs")({
  component: ProgramsPage,
});

function ProgramsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", weeks: "4", days: "4", description: "" });

  const { data: programs } = useQuery({
    queryKey: ["programs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("programs")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const { data, error } = await supabase.from("programs").insert({
        user_id: user.id,
        name: f.name,
        description: f.description || null,
        weeks: Number(f.weeks) || 4,
        days_per_week: Number(f.days) || 4,
      }).select("id").single();
      if (error) throw error;
      // Scaffold days
      const days = Array.from({ length: Number(f.days) || 4 }).map((_, i) => ({
        program_id: data!.id,
        user_id: user.id,
        day_index: i,
        title: `Day ${i + 1}`,
        focus: null,
        exercises: [],
      }));
      await supabase.from("program_days").insert(days);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programs"] });
      setOpen(false);
      setF({ name: "", weeks: "4", days: "4", description: "" });
    },
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase.from("programs").update({ active: false }).eq("user_id", user.id);
      await supabase.from("programs").update({ active: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Train"
        title="Programs"
        action={
          <button onClick={() => setOpen(!open)} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1">
            <Plus className="size-3.5" /> New
          </button>
        }
      />

      {open && (
        <Card className="mb-4">
          <div className="space-y-2.5">
            <Field label="Program name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Weeks" value={f.weeks} onChange={(v) => setF({ ...f, weeks: v })} type="number" />
              <Field label="Days / week" value={f.days} onChange={(v) => setF({ ...f, days: v })} type="number" />
            </div>
            <Field label="Description" value={f.description} onChange={(v) => setF({ ...f, description: v })} />
            <button
              disabled={!f.name || create.isPending}
              onClick={() => create.mutate()}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create program"}
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {!programs?.length ? (
          <EmptyState title="No programs yet." hint="Create your first training block." />
        ) : (
          programs.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between gap-3">
                <Link to="/app/programs/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.active && <Star className="size-3.5 text-primary fill-primary" />}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground font-mono">
                    {p.weeks}w · {p.days_per_week}d/wk
                  </div>
                  {p.description && <div className="mt-1 text-xs text-muted-foreground truncate">{p.description}</div>}
                </Link>
                <div className="flex items-center gap-2">
                  {!p.active && (
                    <button
                      onClick={() => activate.mutate(p.id)}
                      className="text-xs rounded-lg border border-border/60 px-2.5 py-1 hover:border-primary"
                    >
                      Activate
                    </button>
                  )}
                  <Link to="/app/programs/$id" params={{ id: p.id }} className="text-muted-foreground">
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
