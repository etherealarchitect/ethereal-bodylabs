import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { SectionTabs, LAB_TABS } from "@/components/app/SectionTabs";
import {
  InteractiveChart,
  RangeToggle,
  ProgressRing,
  ConsistencyGrid,
  type Range,
  type ChartPoint,
} from "@/components/app/InteractiveChart";
import { Flame, Trophy, Dumbbell, Apple, Target, TrendingDown, TrendingUp, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: 3650,
};

function InsightsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");

  const { data: profile } = useQuery({
    queryKey: ["profile-goals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("target_weight_kg,starting_weight_kg,kcal_target,protein_target_g,training_days_per_week,goal")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data } = useQuery({
    queryKey: ["insights", user?.id, range],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - RANGE_DAYS[range]);
      const sinceISO = since.toISOString();
      const [measurements, meals, workouts] = await Promise.all([
        supabase
          .from("measurements")
          .select("taken_at,weight_kg,body_fat_pct,waist_cm")
          .gte("taken_at", sinceISO)
          .order("taken_at"),
        supabase
          .from("meals")
          .select("eaten_at,kcal,protein_g")
          .gte("eaten_at", sinceISO)
          .order("eaten_at"),
        supabase
          .from("workouts")
          .select("date,duration_min")
          .gte("date", sinceISO.slice(0, 10))
          .order("date"),
      ]);
      return {
        measurements: measurements.data ?? [],
        meals: meals.data ?? [],
        workouts: workouts.data ?? [],
      };
    },
  });

  const cutting = profile?.goal === "cut" || profile?.goal === "lose";
  const weightDirection: "up" | "down" = cutting ? "down" : "up";

  const weightPoints: ChartPoint[] = useMemo(
    () =>
      (data?.measurements ?? [])
        .filter((m) => m.weight_kg != null)
        .map((m) => ({
          x: new Date(m.taken_at).getTime(),
          y: Number(m.weight_kg),
          label: new Date(m.taken_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        })),
    [data?.measurements],
  );

  const bfPoints: ChartPoint[] = useMemo(
    () =>
      (data?.measurements ?? [])
        .filter((m) => m.body_fat_pct != null)
        .map((m) => ({
          x: new Date(m.taken_at).getTime(),
          y: Number(m.body_fat_pct),
          label: new Date(m.taken_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        })),
    [data?.measurements],
  );

  const waistPoints: ChartPoint[] = useMemo(
    () =>
      (data?.measurements ?? [])
        .filter((m) => m.waist_cm != null)
        .map((m) => ({
          x: new Date(m.taken_at).getTime(),
          y: Number(m.waist_cm),
          label: new Date(m.taken_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        })),
    [data?.measurements],
  );

  // Daily kcal / protein series
  const { kcalPoints, proteinPoints, kcalByDay, proteinByDay } = useMemo(() => {
    const kcal = new Map<string, number>();
    const protein = new Map<string, number>();
    for (const m of data?.meals ?? []) {
      const d = m.eaten_at.slice(0, 10);
      kcal.set(d, (kcal.get(d) ?? 0) + (m.kcal ?? 0));
      protein.set(d, (protein.get(d) ?? 0) + Number(m.protein_g ?? 0));
    }
    const days = Array.from(kcal.keys()).sort();
    return {
      kcalByDay: kcal,
      proteinByDay: protein,
      kcalPoints: days.map<ChartPoint>((d) => ({
        x: new Date(d).getTime(),
        y: kcal.get(d) ?? 0,
        label: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
      proteinPoints: days.map<ChartPoint>((d) => ({
        x: new Date(d).getTime(),
        y: Math.round(protein.get(d) ?? 0),
        label: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    };
  }, [data?.meals]);

  // Streaks + consistency grid over the last 84 days (workouts logged)
  const { workoutStreak, longestStreak, workoutDayMap, sessionCount, weeklyPace } = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of data?.workouts ?? []) {
      if (!w.date) continue;
      map[w.date] = Math.min(1, (map[w.date] ?? 0) + 0.5 + (w.duration_min ?? 30) / 120);
    }
    // walk back from today
    let streak = 0;
    let longest = 0;
    let cursor = new Date();
    // best streak in window
    const days = Object.keys(map).sort();
    let run = 0;
    let prev: Date | null = null;
    for (const d of days) {
      const dt = new Date(d);
      if (prev && (dt.getTime() - prev.getTime()) / 86400000 <= 2.5) {
        run += 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = dt;
    }
    // current streak: any workout in the last ~3 days keeps it alive
    for (let i = 0; i < 60; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (map[key]) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      if (i === 0) {
        // grace day (rest day) — check yesterday too before breaking
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    const count = data?.workouts.length ?? 0;
    const weeks = Math.max(1, RANGE_DAYS[range] / 7);
    return {
      workoutDayMap: map,
      workoutStreak: streak,
      longestStreak: longest,
      sessionCount: count,
      weeklyPace: count / weeks,
    };
  }, [data?.workouts, range]);

  const avgKcal = kcalPoints.length
    ? Math.round(kcalPoints.reduce((a, b) => a + b.y, 0) / kcalPoints.length)
    : 0;
  const avgProtein = proteinPoints.length
    ? Math.round(proteinPoints.reduce((a, b) => a + b.y, 0) / proteinPoints.length)
    : 0;

  // Today's rings
  const todayKey = new Date().toISOString().slice(0, 10);
  const kcalToday = kcalByDay.get(todayKey) ?? 0;
  const proteinToday = Math.round(proteinByDay.get(todayKey) ?? 0);
  const workoutsThisWeek = (() => {
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);
    return (data?.workouts ?? []).filter((w) => w.date && new Date(w.date) >= sevenAgo).length;
  })();

  const nothingLogged =
    weightPoints.length === 0 && kcalPoints.length === 0 && sessionCount === 0;

  return (
    <div>
      <PageHeader eyebrow="Lab" title="Insights" />
      <SectionTabs items={LAB_TABS} />

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {range === "all" ? "All time" : `Last ${range}`}
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      {/* Momentum banner */}
      <Card className="mb-3 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 60% at 0% 0%, hsl(var(--primary)/0.35), transparent 60%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-11 rounded-2xl bg-primary/15 text-primary">
              <Flame className="size-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Current streak
              </div>
              <div className="text-2xl font-semibold tabular-nums leading-none">
                {workoutStreak} <span className="text-sm font-normal text-muted-foreground">day{workoutStreak === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Best streak
            </div>
            <div className="text-lg font-semibold tabular-nums flex items-center gap-1 justify-end">
              <Trophy className="size-3.5 text-primary" /> {longestStreak}
            </div>
          </div>
        </div>
        {workoutStreak > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: Math.min(workoutStreak, 14) }).map((_, i) => (
              <span
                key={i}
                className="inline-block size-2 rounded-full bg-primary"
                style={{
                  animation: `pulse 1.6s ease-in-out ${i * 60}ms infinite`,
                  opacity: 0.55 + (i / 14) * 0.45,
                }}
              />
            ))}
            {workoutStreak > 14 && (
              <span className="text-[10px] font-mono text-muted-foreground ml-1">
                +{workoutStreak - 14}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Today rings */}
      <Card className="mb-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Today
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ProgressRing
            value={kcalToday}
            max={profile?.kcal_target ?? 2200}
            label="Calories"
            sublabel={`${kcalToday}`}
          />
          <ProgressRing
            value={proteinToday}
            max={profile?.protein_target_g ?? 160}
            label="Protein"
            sublabel={`${proteinToday}g`}
            color="hsl(var(--chart-2, 200 80% 55%))"
          />
          <ProgressRing
            value={workoutsThisWeek}
            max={profile?.training_days_per_week ?? 5}
            label="Sessions/wk"
            sublabel={`${workoutsThisWeek}/${profile?.training_days_per_week ?? 5}`}
            color="hsl(var(--chart-3, 145 70% 45%))"
          />
        </div>
      </Card>

      {/* Consistency grid */}
      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Consistency · 12 weeks
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Dumbbell className="size-3" /> {sessionCount} sessions · {weeklyPace.toFixed(1)}/wk
          </div>
        </div>
        <ConsistencyGrid days={workoutDayMap} />
      </Card>

      {/* Weight chart */}
      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Weight (kg)
          </div>
          {cutting ? (
            <TrendingDown className="size-3.5 text-muted-foreground" />
          ) : (
            <TrendingUp className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <InteractiveChart
          points={weightPoints}
          unit="kg"
          direction={weightDirection}
          goal={profile?.target_weight_kg ?? undefined}
        />
      </Card>

      {bfPoints.length > 0 && (
        <Card className="mb-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Body fat (%)
          </div>
          <InteractiveChart points={bfPoints} unit="%" direction="down" />
        </Card>
      )}

      {waistPoints.length > 0 && (
        <Card className="mb-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Waist (cm)
          </div>
          <InteractiveChart points={waistPoints} unit="cm" direction="down" />
        </Card>
      )}

      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Daily kcal
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Apple className="size-3" /> avg {avgKcal}
          </div>
        </div>
        <InteractiveChart
          points={kcalPoints}
          unit="kcal"
          direction="up"
          goal={profile?.kcal_target ?? undefined}
          formatValue={(n) => Math.round(n).toString()}
        />
      </Card>

      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Daily protein (g)
          </div>
          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Target className="size-3" /> avg {avgProtein}g
          </div>
        </div>
        <InteractiveChart
          points={proteinPoints}
          unit="g"
          direction="up"
          goal={profile?.protein_target_g ?? undefined}
          formatValue={(n) => Math.round(n).toString()}
        />
      </Card>

      {/* Achievements strip */}
      <Card className="mb-3">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary flex items-center gap-1">
          <Sparkles className="size-3" /> Milestones unlocked
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge unlocked={workoutStreak >= 3} label={`🔥 3-day streak`} />
          <Badge unlocked={workoutStreak >= 7} label={`⚡ Week warrior`} />
          <Badge unlocked={workoutStreak >= 30} label={`👑 30-day forge`} />
          <Badge unlocked={sessionCount >= 10} label={`🏋 10 sessions`} />
          <Badge unlocked={sessionCount >= 50} label={`💪 50 sessions`} />
          <Badge unlocked={weightPoints.length >= 4} label={`📊 4 check-ins`} />
          <Badge
            unlocked={
              !!profile?.target_weight_kg &&
              weightPoints.length > 1 &&
              (cutting
                ? weightPoints[weightPoints.length - 1].y < weightPoints[0].y
                : weightPoints[weightPoints.length - 1].y > weightPoints[0].y)
            }
            label={cutting ? "📉 Trending down" : "📈 Trending up"}
          />
        </div>
      </Card>

      {nothingLogged && (
        <EmptyState
          title="Nothing to analyze yet."
          hint="Log meals, workouts and measurements — trends and streaks unlock after your first entries."
        />
      )}
    </div>
  );
}

function Badge({ unlocked, label }: { unlocked: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        unlocked
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border/60 bg-secondary/50 text-muted-foreground opacity-60"
      }`}
      title={unlocked ? "Unlocked" : "Locked — keep going!"}
    >
      {label}
    </span>
  );
}
