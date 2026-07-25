import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "log_measurement",
  title: "Log a body measurement",
  description: "Insert a new body measurement (weight in kg, body fat percent, optional notes) for the signed-in user.",
  inputSchema: {
    weight_kg: z.number().positive().max(500).optional().describe("Body weight in kilograms."),
    body_fat_pct: z.number().min(0).max(80).optional().describe("Body fat percentage."),
    notes: z.string().max(500).optional().describe("Optional freeform notes."),
    taken_at: z.string().datetime().optional().describe("ISO 8601 timestamp; defaults to now."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ weight_kg, body_fat_pct, notes, taken_at }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (weight_kg == null && body_fat_pct == null) {
      return {
        content: [{ type: "text", text: "Provide weight_kg and/or body_fat_pct." }],
        isError: true,
      };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("measurements")
      .insert({
        user_id: ctx.getUserId(),
        weight_kg: weight_kg ?? null,
        body_fat_pct: body_fat_pct ?? null,
        notes: notes ?? null,
        taken_at: taken_at ?? new Date().toISOString(),
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged measurement ${data?.id ?? ""}` }],
      structuredContent: { measurement: data },
    };
  },
});
