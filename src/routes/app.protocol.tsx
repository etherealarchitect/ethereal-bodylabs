import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { Plus, Trash2, Check, Syringe, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/app/protocol")({
  component: ProtocolPage,
});

function ProtocolPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const { data: items } = useQuery({
    queryKey: ["protocol", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("protocol_items")
        .select("*").eq("date", today).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user || !name) return;
      const { error } = await supabase.from("protocol_items")
        .insert({ user_id: user.id, name, category: category || null, date: today });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocol"] }); qc.invalidateQueries({ queryKey: ["today"] }); setName(""); setCategory(""); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await supabase.from("protocol_items").update({ done }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["protocol"] }); qc.invalidateQueries({ queryKey: ["today"] }); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("protocol_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["protocol"] }),
  });

  const done = items?.filter((i) => i.done).length ?? 0;
  const total = items?.length ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <PageHeader eyebrow="Protocol" title="Today's ritual" />

      <Link to="/app/doses"
        className="mb-4 flex items-center gap-3 rounded-2xl glass p-3 hover:border-primary/40 transition-colors">
        <div className="size-9 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
          <Syringe className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Doses</div>
          <div className="text-[11px] text-muted-foreground">Schedules, upcoming and history for prescribed compounds.</div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <Card className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Compliance</span>
          <span className="font-mono">{done}/{total} · {pct}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <Card className="mb-4">
        <div className="grid grid-cols-[1fr_100px_auto] gap-2">
          <input placeholder="Item (e.g. 3g creatine)" value={name} onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary" />
          <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm outline-none focus:border-primary" />
          <button onClick={() => add.mutate()} disabled={!name || add.isPending}
            className="h-10 rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium disabled:opacity-50">
            <Plus className="size-4" />
          </button>
        </div>
      </Card>

      <div className="space-y-1.5">
        {!items?.length ? (
          <EmptyState title="Nothing on today's protocol." hint="Add supplements, habits, or check-ins above." />
        ) : items.map((it) => (
          <button key={it.id} onClick={() => toggle.mutate({ id: it.id, done: !it.done })}
            className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition-colors ${
              it.done ? "border-success/40 bg-success/10" : "border-border/60 bg-surface-1/70 hover:border-primary/40"
            }`}>
            <div className={`size-5 rounded-md border flex items-center justify-center transition-colors ${
              it.done ? "border-success bg-success text-background" : "border-border"
            }`}>
              {it.done && <Check className="size-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.name}</div>
              {it.category && <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground mt-0.5">{it.category}</div>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); del.mutate(it.id); }}
              className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="size-3.5" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
