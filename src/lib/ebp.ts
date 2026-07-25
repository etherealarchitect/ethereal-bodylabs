/**
 * .ebp — ETHEREAL BODYLABS Portable profile format.
 *
 * A self-contained JSON snapshot of a user's core domain data. Photos are
 * referenced by storage path only; binary blobs stay in Cloud Storage.
 * Import merges rows (insert-only, per-user).
 */
import { supabase } from "@/integrations/supabase/client";

export const EBP_VERSION = 1;

export type EbpPayload = {
  format: "ethereal-bodylab-profile";
  version: number;
  exported_at: string;
  profile: any | null;
  exercises: any[];
  workouts: any[];
  workout_sets: any[];
  meals: any[];
  protocol_items: any[];
  measurements: any[];
  physique_photos: any[];
};

export async function exportProfile(): Promise<EbpPayload> {
  const [profile, exercises, workouts, sets, meals, protocol, measurements, photos] =
    await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("exercises").select("*"),
      supabase.from("workouts").select("*"),
      supabase.from("workout_sets").select("*"),
      supabase.from("meals").select("*"),
      supabase.from("protocol_items").select("*"),
      supabase.from("measurements").select("*"),
      supabase.from("physique_photos").select("*"),
    ]);
  return {
    format: "ethereal-bodylab-profile",
    version: EBP_VERSION,
    exported_at: new Date().toISOString(),
    profile: profile.data,
    exercises: exercises.data ?? [],
    workouts: workouts.data ?? [],
    workout_sets: sets.data ?? [],
    meals: meals.data ?? [],
    protocol_items: protocol.data ?? [],
    measurements: measurements.data ?? [],
    physique_photos: photos.data ?? [],
  };
}

export function downloadEbp(payload: EbpPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ethereal-bodylab-${new Date().toISOString().slice(0, 10)}.ebp.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProfile(
  payload: EbpPayload,
  userId: string,
): Promise<{ imported: number }> {
  if (payload.format !== "ethereal-bodylab-profile") throw new Error("Not an .ebp file.");
  if (payload.version > EBP_VERSION) throw new Error("File is from a newer version.");

  let imported = 0;

  // Rewrite user_id / id relationships to belong to the current user and
  // avoid id collisions. Exercises and workouts get new ids so we can
  // remap dependent rows.
  const rekey = <T extends { id?: string; user_id?: string }>(rows: T[]) =>
    rows.map((r) => ({ ...r, id: crypto.randomUUID(), user_id: userId }));

  const stripAudit = (r: any) => {
    const { created_at, updated_at, ...rest } = r;
    return rest;
  };

  const exMap = new Map<string, string>();
  const newExercises = payload.exercises.map((e) => {
    const nid = crypto.randomUUID();
    if (e.id) exMap.set(e.id, nid);
    return stripAudit({ ...e, id: nid, user_id: userId });
  });
  if (newExercises.length) {
    const { error } = await supabase.from("exercises").insert(newExercises);
    if (!error) imported += newExercises.length;
  }

  const wMap = new Map<string, string>();
  const newWorkouts = payload.workouts.map((w) => {
    const nid = crypto.randomUUID();
    if (w.id) wMap.set(w.id, nid);
    return stripAudit({ ...w, id: nid, user_id: userId });
  });
  if (newWorkouts.length) {
    const { error } = await supabase.from("workouts").insert(newWorkouts);
    if (!error) imported += newWorkouts.length;
  }

  const newSets = payload.workout_sets
    .filter((s) => wMap.has(s.workout_id))
    .map((s) =>
      stripAudit({
        ...s,
        id: crypto.randomUUID(),
        user_id: userId,
        workout_id: wMap.get(s.workout_id)!,
        exercise_id: s.exercise_id ? exMap.get(s.exercise_id) ?? null : null,
      }),
    );
  if (newSets.length) {
    const { error } = await supabase.from("workout_sets").insert(newSets);
    if (!error) imported += newSets.length;
  }

  for (const [table, rows] of [
    ["meals", payload.meals],
    ["protocol_items", payload.protocol_items],
    ["measurements", payload.measurements],
    ["physique_photos", payload.physique_photos],
  ] as const) {
    const clean = rekey(rows).map(stripAudit);
    if (!clean.length) continue;
    const { error } = await supabase.from(table as any).insert(clean);
    if (!error) imported += clean.length;
  }

  return { imported };
}
