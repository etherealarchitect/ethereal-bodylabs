/**
 * Alice — floating AI guide with persistent per-user conversation memory.
 * Uses OpenAI GPT-5.6-terra via the Lovable AI Gateway with priority serving
 * and reasoning disabled (required for GPT-5.6 chat completions with tools).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MODEL = "openai/gpt-5.6-terra";
const FEATURE = "alice.chat";
const MAX_HISTORY = 24; // messages sent back to the model

const AskInput = z.object({
  threadId: z.string().uuid().optional().nullable(),
  message: z.string().min(1).max(4000),
});

const ListInput = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});

const ThreadInput = z.object({
  threadId: z.string().uuid(),
});

async function logUsage(
  supabaseAdmin: any,
  userId: string,
  status: "ok" | "error",
  extras: { tokens_in?: number | null; tokens_out?: number | null; latency_ms?: number; run_id?: string | null; error?: string | null },
) {
  try {
    await supabaseAdmin.from("ai_usage_events").insert({
      user_id: userId,
      feature: FEATURE,
      model: MODEL,
      status,
      tokens_in: extras.tokens_in ?? null,
      tokens_out: extras.tokens_out ?? null,
      latency_ms: extras.latency_ms ?? null,
      run_id: extras.run_id ?? null,
      error: extras.error ?? null,
    });
  } catch {
    // Telemetry is best-effort; never block the user reply on logging.
  }
}

function systemPrompt(snapshot: unknown): string {
  return `You are Alice — the friendly in-app AI guide for ETHEREAL BODYLABS.
You help the user with:
- how to use the app (Today, Workouts, Nutrition, Physique, Bloodwork, Doses, Protocol, Coach, Reports, Insights, Billing)
- food, macros, recipes, meal ideas
- health, wellness, sleep, recovery, mindset
- exercise technique, programming basics, mobility
- general questions about supplements, hydration, habits

Voice: warm, concise, practical. Use short paragraphs and light markdown (bold, bullet lists).
Never invent user numbers — reference the snapshot below only if actually populated.
Use metric units unless the user says otherwise. Address the user by first name occasionally if known.

Safety guardrails:
- You are NOT a doctor. For anything medical, prescriptions, peptides, hormones, bloodwork abnormalities,
  injury diagnosis or medication changes, tell the user to consult their physician.
- Never provide dosage instructions for prescription drugs, peptides, or hormones — refuse and redirect
  the user to their prescriber and the Doses page's medical disclaimer.
- Never diagnose. Never guess at lab values. If asked for a specific medical answer, explain why you can't
  and suggest safe next steps in-app.
- If a request is out of scope, say so briefly and suggest what to try in-app instead.

Keep answers under 200 words unless the user explicitly asks for detail.

USER_SNAPSHOT_JSON:
${JSON.stringify(snapshot)}`;
}

async function loadSnapshot(supabase: any, userId: string) {
  const [{ data: profile }, latestMeasure] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,goal,kcal_target,protein_target_g,training_days_per_week,units,target_weight_kg,starting_weight_kg")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("measurements")
      .select("taken_at,weight_kg")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    name: profile?.display_name ?? null,
    goal: profile?.goal ?? null,
    units: profile?.units ?? "metric",
    kcal_target: profile?.kcal_target ?? null,
    protein_target_g: profile?.protein_target_g ?? null,
    training_days_per_week: profile?.training_days_per_week ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
    starting_weight_kg: profile?.starting_weight_kg ?? null,
    current_weight_kg: latestMeasure.data?.weight_kg ?? null,
  };
}

/**
 * Send one user turn. Creates a new thread if threadId is absent.
 * Persists user + assistant messages. Returns { threadId, reply }.
 */
export const askAlice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve or create thread.
    let threadId = data.threadId ?? null;
    if (threadId) {
      const { data: owned } = await supabase
        .from("alice_threads")
        .select("id")
        .eq("id", threadId)
        .maybeSingle();
      if (!owned) threadId = null;
    }
    if (!threadId) {
      const title = data.message.slice(0, 60).replace(/\s+/g, " ").trim() || "New chat";
      const { data: created, error } = await supabase
        .from("alice_threads")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (error || !created) throw new Error("Could not start a new chat.");
      threadId = created.id as string;
    }

    // Persist the user turn first so it survives model failures.
    await supabase.from("alice_messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content: data.message,
    });

    // Load recent history + snapshot in parallel.
    const [{ data: history }, snapshot] = await Promise.all([
      supabase
        .from("alice_messages")
        .select("role,content,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY),
      loadSnapshot(supabase, userId),
    ]);
    const ordered = (history ?? []).slice().reverse();

    const started = Date.now();
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        service_tier: "priority",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: systemPrompt(snapshot) },
          ...ordered.map((m: any) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    const runId = res.headers.get("x-lovable-aig-run-id");

    if (!res.ok) {
      const text = await res.text();
      const errMsg =
        res.status === 429
          ? "I'm getting a lot of questions right now — try again in a moment."
          : res.status === 402
            ? "AI credits exhausted. Top up in Settings to keep chatting."
            : `Alice error (${res.status}): ${text.slice(0, 200)}`;
      await logUsage(supabaseAdmin, userId, "error", {
        latency_ms: Date.now() - started,
        run_id: runId,
        error: errMsg,
      });
      throw new Error(errMsg);
    }

    const json = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage ?? {};

    // Persist assistant reply + touch the thread.
    await Promise.all([
      supabase.from("alice_messages").insert({
        thread_id: threadId,
        user_id: userId,
        role: "assistant",
        content: reply,
        tokens_in: usage.prompt_tokens ?? null,
        tokens_out: usage.completion_tokens ?? null,
      }),
      supabase
        .from("alice_threads")
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", threadId),
    ]);

    await logUsage(supabaseAdmin, userId, "ok", {
      tokens_in: usage.prompt_tokens ?? null,
      tokens_out: usage.completion_tokens ?? null,
      latency_ms: Date.now() - started,
      run_id: runId,
    });

    return { threadId, reply };
  });

export const listAliceThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: threads } = await supabase
      .from("alice_threads")
      .select("id,title,last_message_at,created_at")
      .order("last_message_at", { ascending: false })
      .limit(data.limit ?? 20);
    return { threads: threads ?? [] };
  });

export const loadAliceThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ThreadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: messages } = await supabase
      .from("alice_messages")
      .select("id,role,content,created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    return { messages: messages ?? [] };
  });

export const deleteAliceThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ThreadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await supabase.from("alice_threads").delete().eq("id", data.threadId);
    return { ok: true };
  });
