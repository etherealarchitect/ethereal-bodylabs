/**
 * AI Coach — server function calling Lovable AI Gateway (Gemini flash).
 * Authenticated: requires signed-in user. Injects a short profile of the
 * user's recent activity as system context.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Msg = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});
const Input = z.object({
  messages: z.array(Msg).min(1).max(30),
});

export const coachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
    const { supabase, userId } = context;

    // Build lightweight user context (last 7 days).
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceISO = since.toISOString();

    const [workouts, meals, protocol, measurements] = await Promise.all([
      supabase
        .from("workouts")
        .select("date,title,duration_min,workout_sets(exercise_name,reps,weight_kg)")
        .gte("date", sinceISO.slice(0, 10))
        .order("date", { ascending: false })
        .limit(10),
      supabase
        .from("meals")
        .select("eaten_at,name,kcal,protein_g,carbs_g,fat_g")
        .gte("eaten_at", sinceISO)
        .order("eaten_at", { ascending: false })
        .limit(30),
      supabase
        .from("protocol_items")
        .select("date,name,done")
        .gte("date", sinceISO.slice(0, 10)),
      supabase
        .from("measurements")
        .select("taken_at,weight_kg,body_fat_pct")
        .order("taken_at", { ascending: false })
        .limit(5),
    ]);

    const ctx = {
      userId,
      workouts_last7: workouts.data ?? [],
      meals_last7: meals.data ?? [],
      protocol_last7: protocol.data ?? [],
      recent_measurements: measurements.data ?? [],
    };

    const system = `You are ETHEREAL Coach — an elite, evidence-based training and nutrition assistant inside the ETHEREAL BODYLABS app.
Speak concisely. Use metric units unless the user asks otherwise. Reference the user's actual recent data when relevant. Never invent numbers you can't see in the context. If context is empty, ask what they'd like help with. Keep replies under 180 words unless writing a program.
USER_CONTEXT_JSON:
${JSON.stringify(ctx).slice(0, 6000)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI error (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
