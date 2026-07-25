/**
 * Achievements + streaks. Computes user's current training streak from the
 * `workouts` table and awards simple milestone badges on demand.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Badge = { code: string; title: string; description: string };

const CATALOG: Badge[] = [
  { code: "first_workout", title: "First Lift", description: "Logged your first session." },
  { code: "first_meal", title: "First Fuel", description: "Logged your first meal." },
  { code: "streak_7", title: "7-Day Streak", description: "Trained 7 days in a row." },
  { code: "streak_30", title: "30-Day Streak", description: "Trained 30 days in a row." },
  { code: "first_pr", title: "First PR", description: "Recorded your first personal record." },
  { code: "ten_workouts", title: "Consistent", description: "Logged 10 sessions." },
];

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const cur = new Date();
  cur.setUTCHours(0, 0, 0, 0);
  // Allow today OR yesterday as starting anchor (rest days shouldn't nuke it).
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (!set.has(iso(cur))) cur.setUTCDate(cur.getUTCDate() - 1);
  while (set.has(iso(cur))) {
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

export const getAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [workoutsRes, mealsRes, existingRes] = await Promise.all([
      supabase.from("workouts").select("date").order("date", { ascending: false }).limit(120),
      supabase.from("meals").select("id").limit(1),
      supabase.from("user_achievements").select("code,title,description,awarded_at"),
    ]);

    const dates = (workoutsRes.data ?? []).map((r) => r.date as string);
    const streak = computeStreak(dates);
    const workoutCount = (workoutsRes.data ?? []).length;
    const existing = new Set((existingRes.data ?? []).map((r) => r.code));
    const toAward: Badge[] = [];
    const push = (code: string) => {
      const b = CATALOG.find((x) => x.code === code);
      if (b && !existing.has(code)) toAward.push(b);
    };
    if (workoutCount >= 1) push("first_workout");
    if ((mealsRes.data ?? []).length >= 1) push("first_meal");
    if (streak >= 7) push("streak_7");
    if (streak >= 30) push("streak_30");
    if (workoutCount >= 10) push("ten_workouts");

    if (toAward.length) {
      await supabase.from("user_achievements").insert(
        toAward.map((b) => ({ user_id: userId, code: b.code, title: b.title, description: b.description })),
      );
    }
    const { data: all } = await supabase
      .from("user_achievements")
      .select("code,title,description,awarded_at")
      .order("awarded_at", { ascending: false });

    return {
      streak,
      workoutCount,
      achievements: all ?? [],
      newlyAwarded: toAward.map((b) => b.code),
    };
  });
