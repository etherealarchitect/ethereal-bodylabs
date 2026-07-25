/**
 * AI-powered training plan, meal plan, and exercise lookup.
 * Uses Lovable AI Gateway (Gemini) for JSON generation and image generation.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAiJson(system: string, user: string): Promise<any> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings.");
    throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw);
  } catch {
    // Try to recover from ```json fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  }
}

async function callAiText(system: string, user: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings.");
    throw new Error(`AI error (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

async function generateExerciseImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Clean, minimal instructional illustration of proper form for: ${prompt}. Single figure, side view, neutral studio background, muted violet accent. No text overlay.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

/* ---------------- Training plan ---------------- */

const TrainingInput = z.object({
  goal: z.string().min(2).max(200),
  daysPerWeek: z.number().int().min(2).max(7),
  sessionMinutes: z.number().int().min(20).max(180),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.string().max(300).default("full gym"),
  focus: z.string().max(300).optional(),
  weeks: z.number().int().min(1).max(12).default(4),
});

export const generateTrainingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TrainingInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const system = `You are an elite strength coach. Produce evidence-based, safe, hypertrophy/strength programs (rep ranges, progressive overload, appropriate volume per muscle group per week). Output ONLY valid JSON matching the schema. Metric units.`;
    const user = `Build a ${data.weeks}-week training program.
Goal: ${data.goal}
Experience: ${data.experience}
Days/week: ${data.daysPerWeek}
Session length: ${data.sessionMinutes} min
Equipment available: ${data.equipment}
Extra focus: ${data.focus ?? "none"}

Return JSON with this exact shape:
{
  "name": "string (short program name)",
  "description": "string (1-2 sentence summary)",
  "days": [
    {
      "day_index": 0,
      "title": "e.g. Push A",
      "focus": "e.g. Chest / Shoulders / Triceps",
      "exercises": [
        { "name": "Barbell Bench Press", "muscle_group": "chest", "equipment": "barbell", "sets": 4, "reps": "6-8", "rest_sec": 150, "notes": "warmup 2 sets" }
      ]
    }
  ]
}
Rules:
- exactly ${data.daysPerWeek} days, day_index 0..${data.daysPerWeek - 1}
- 4-7 exercises per day
- muscle_group ∈ [chest, back, shoulders, arms, legs, core, cardio, mobility]
- rest_sec integer 30-240
- reps as string like "8-12" or "AMRAP"
- Prioritise compound lifts first, then accessories.`;

    const plan = await callAiJson(system, user);
    if (!plan?.name || !Array.isArray(plan?.days)) {
      throw new Error("AI returned an invalid plan. Please try again.");
    }

    // Deactivate existing programs, create new one active.
    await supabase.from("programs").update({ active: false }).eq("user_id", userId);
    const { data: prog, error: perr } = await supabase
      .from("programs")
      .insert({
        user_id: userId,
        name: String(plan.name).slice(0, 120),
        description: plan.description ? String(plan.description).slice(0, 500) : null,
        weeks: data.weeks,
        days_per_week: data.daysPerWeek,
        active: true,
      })
      .select("id")
      .single();
    if (perr || !prog) throw new Error(perr?.message ?? "Failed to create program");

    // Insert days + upsert exercises into user's library.
    const seen = new Set<string>();
    const daysToInsert = plan.days.slice(0, data.daysPerWeek).map((d: any, i: number) => ({
      program_id: prog.id,
      user_id: userId,
      day_index: i,
      title: String(d.title ?? `Day ${i + 1}`).slice(0, 80),
      focus: d.focus ? String(d.focus).slice(0, 120) : null,
      exercises: Array.isArray(d.exercises) ? d.exercises.slice(0, 12) : [],
    }));
    if (daysToInsert.length) {
      await supabase.from("program_days").insert(daysToInsert);
    }

    // Build exercise library entries from unique exercises.
    for (const d of daysToInsert) {
      for (const ex of (d.exercises as any[]) ?? []) {
        const key = String(ex.name ?? "").toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
      }
    }
    if (seen.size) {
      const { data: existing } = await supabase
        .from("exercises")
        .select("name")
        .eq("user_id", userId);
      const existingSet = new Set((existing ?? []).map((e) => e.name.toLowerCase().trim()));
      const toInsert: any[] = [];
      for (const d of daysToInsert) {
        for (const ex of (d.exercises as any[]) ?? []) {
          const name = String(ex.name ?? "").trim();
          if (!name) continue;
          const k = name.toLowerCase();
          if (existingSet.has(k)) continue;
          existingSet.add(k);
          toInsert.push({
            user_id: userId,
            name: name.slice(0, 120),
            muscle_group: ex.muscle_group ? String(ex.muscle_group).slice(0, 40) : null,
            equipment: ex.equipment ? String(ex.equipment).slice(0, 60) : null,
          });
        }
      }
      if (toInsert.length) await supabase.from("exercises").insert(toInsert);
    }

    return { programId: prog.id, name: plan.name, dayCount: daysToInsert.length };
  });

/* ---------------- Meal plan ---------------- */

const MealPlanInput = z.object({
  goal: z.string().min(2).max(200),
  kcalTarget: z.number().int().min(1000).max(6000),
  proteinTarget: z.number().int().min(50).max(400),
  mealsPerDay: z.number().int().min(2).max(6).default(4),
  preferences: z.string().max(400).optional(),
  restrictions: z.string().max(400).optional(),
});

export const generateMealPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MealPlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const system = `You are a registered sports dietitian. Design realistic, high-protein, whole-food meals. Output ONLY valid JSON matching the schema. Metric units.`;
    const user = `Design a one-day rotation of ${data.mealsPerDay} meals that total approximately ${data.kcalTarget} kcal and at least ${data.proteinTarget}g protein.
Goal: ${data.goal}
Preferences: ${data.preferences ?? "none"}
Restrictions / allergies: ${data.restrictions ?? "none"}

Return JSON with this exact shape:
{
  "meals": [
    { "name": "string (short meal name)", "kcal": 500, "protein_g": 40, "carbs_g": 50, "fat_g": 15, "notes": "short recipe / ingredients list" }
  ]
}
Rules:
- exactly ${data.mealsPerDay} meals
- integer macros, sensible splits across the day
- notes: 1-3 sentences with core ingredients and prep hint`;

    const plan = await callAiJson(system, user);
    if (!Array.isArray(plan?.meals)) throw new Error("AI returned an invalid meal plan.");
    const rows = plan.meals.slice(0, data.mealsPerDay).map((m: any) => ({
      user_id: userId,
      name: String(m.name ?? "Meal").slice(0, 120),
      kcal: Number.isFinite(+m.kcal) ? Math.round(+m.kcal) : null,
      protein_g: Number.isFinite(+m.protein_g) ? Math.round(+m.protein_g) : null,
      carbs_g: Number.isFinite(+m.carbs_g) ? Math.round(+m.carbs_g) : null,
      fat_g: Number.isFinite(+m.fat_g) ? Math.round(+m.fat_g) : null,
      notes: m.notes ? String(m.notes).slice(0, 600) : null,
      favorite: true,
    }));
    if (rows.length) await supabase.from("meal_templates").insert(rows);
    return { count: rows.length };
  });

/* ---------------- Exercise lookup ---------------- */

const LookupInput = z.object({
  name: z.string().min(2).max(120),
  includeImage: z.boolean().default(true),
});

export const lookupExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LookupInput.parse(input))
  .handler(async ({ data }) => {
    const system = `You are a strength coach and physiotherapist. Explain exercises with concise, evidence-based cues.`;
    const user = `Explain the exercise: "${data.name}".
Return markdown with these sections (use ## headings):
## Setup
## Execution (step-by-step)
## Key cues
## Common mistakes
## Muscles worked
## Recommended sets & reps
Keep total under 260 words.`;

    const [instructions, imageUrl] = await Promise.all([
      callAiText(system, user),
      data.includeImage ? generateExerciseImage(data.name) : Promise.resolve(null),
    ]);
    return { instructions, imageUrl };
  });
