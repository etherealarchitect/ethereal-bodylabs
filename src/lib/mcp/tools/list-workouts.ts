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
  name: "list_workouts",
  title: "List my workouts",
  description: "List the signed-in user's recent workouts, newest first. Optionally filter by date range.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Maximum workouts to return (1-100)."),
    since: z.string().datetime().optional().describe("ISO 8601 timestamp; return workouts on or after this date."),
    until: z.string().datetime().optional().describe("ISO 8601 timestamp; return workouts on or before this date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, since, until }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("workouts")
      .select("id, name, started_at, ended_at, notes, program_id")
      .eq("user_id", ctx.getUserId())
      .order("started_at", { ascending: false })
      .limit(limit);
    if (since) q = q.gte("started_at", since);
    if (until) q = q.lte("started_at", until);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { workouts: data ?? [] },
    };
  },
});
