import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader } from "@/components/app/AppShell";
import { Activity, Apple, CheckCircle2, Camera } from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: TodayPage,
});

function TodayPage() {
  const { user } = useAuth();
  const uid = user?.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data } = useQuery({
    queryKey: ["today", uid, today],
    enabled: !!uid,
    queryFn: async () => {
      const [workouts, meals, protocol, measurements] = await Promise.all([
        supabase.from("workouts").select("id,title,duration_min").eq("date", today).order("created_at", { ascending: false }),
        supabase.from("meals").select("kcal,protein_g,carbs_g,fat_g").gte("eaten_at", today).order("eaten_at", { ascending: false }),
        supabase.from("protocol_items").select("done").eq("date", today),
        supabase.from("measurements").select("weight_kg").order("taken_at", { ascending: false }).limit(1),
      ]);
      const kcal = (meals.data ?? []).reduce((a, m) => a + (m.kcal ?? 0), 0);
      const protein = (meals.data ?? []).reduce((a, m) => a + Number(m.protein_g ?? 0), 0);
      const done = (protocol.data ?? []).filter((p) => p.done).length;
      const total = (protocol.data ?? []).length;
      return {
        workouts: workouts.data ?? [],
        kcal, protein: Math.round(protein),
        protocolDone: done, protocolTotal: total,
        weight: measurements.data?.[0]?.weight_kg,
      };
    },
  });

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader eyebrow={greeting} title="Today" />

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Workouts" value={String(data?.workouts.length ?? 0)} icon={<Activity className="size-4" />} to="/app/workouts" />
        <Stat label="kcal" value={String(data?.kcal ?? 0)} icon={<Apple className="size-4" />} to="/app/nutrition" />
        <Stat label="Protein" value={`${data?.protein ?? 0}g`} icon={<Apple className="size-4" />} to="/app/nutrition" />
        <Stat label="Protocol" value={`${data?.protocolDone ?? 0}/${data?.protocolTotal ?? 0}`} icon={<CheckCircle2 className="size-4" />} to="/app/protocol" />
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Latest weight</div>
            <div className="mt-0.5 text-xl font-semibold">
              {data?.weight ? `${data.weight} kg` : "—"}
            </div>
          </div>
          <Link to="/app/physique" className="rounded-lg border border-border/60 px-3 py-1.5 text-xs hover:bg-surface-2">
            <Camera className="inline size-3.5 mr-1" /> Log
          </Link>
        </div>
      </Card>

      <div className="mt-6 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today's sessions</div>
        {(data?.workouts ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground text-center">
            No sessions logged yet.
          </div>
        ) : data!.workouts.map((w) => (
          <Card key={w.id}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{w.title ?? "Untitled session"}</div>
              <div className="text-xs text-muted-foreground">{w.duration_min ?? "—"} min</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, icon, to }: { label: string; value: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} className="block rounded-2xl border border-border/60 bg-surface-1/70 p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider font-mono">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </Link>
  );
}
