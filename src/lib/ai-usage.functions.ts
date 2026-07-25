import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "scottkbrown1337@gmail.com";
function assertAdmin(claims: any): void {
  const email = String(claims?.email ?? "").toLowerCase().trim();
  if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
}

export type AiUsageRow = {
  id: number;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  feature: string;
  model: string;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  status: string;
  error: string | null;
  run_id: string | null;
};

export type AiUsageFilters = {
  model?: string;
  feature?: string;
  user?: string; // email or uuid substring
  status?: "ok" | "error" | "all";
  minLatency?: number;
  minTokens?: number;
  from?: string; // ISO
  to?: string; // ISO
  limit?: number;
  offset?: number;
};

export type AiUsageListResult = {
  rows: AiUsageRow[];
  total: number;
  facets: {
    models: string[];
    features: string[];
  };
  summary: {
    count: number;
    errors: number;
    avg_latency_ms: number;
    total_tokens_in: number;
    total_tokens_out: number;
  };
};

async function loadUserEmails(userIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds.filter((x): x is string => !!x)));
  if (!ids.length) return new Map();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const map = new Map<string, string>();
  // batch via listUsers or per-id getUserById; use profiles table if present
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  for (const r of (data as any[]) ?? []) map.set(r.id, r.display_name ?? "");
  // fill missing with auth
  const missing = ids.filter((id) => !map.has(id) || !map.get(id));
  for (const id of missing) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
    if (u?.user?.email) map.set(id, u.user.email);
  }
  return map;
}

async function queryEvents(data: AiUsageFilters, opts: { forExport: boolean }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin.from("ai_usage_events").select("*", { count: "exact" });

  if (data.model) q = q.eq("model", data.model);
  if (data.feature) q = q.eq("feature", data.feature);
  if (data.status === "ok") q = q.eq("status", "ok");
  if (data.status === "error") q = q.neq("status", "ok");
  if (typeof data.minLatency === "number" && data.minLatency > 0) q = q.gte("latency_ms", data.minLatency);
  if (typeof data.minTokens === "number" && data.minTokens > 0)
    q = q.gte("tokens_out", data.minTokens);
  if (data.from) q = q.gte("created_at", data.from);
  if (data.to) q = q.lte("created_at", data.to);

  // user filter: uuid exact match, else resolve emails via profiles/auth
  if (data.user) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.user,
    );
    if (isUuid) {
      q = q.eq("user_id", data.user);
    } else {
      const term = data.user.toLowerCase();
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${term}%`)
        .limit(200);
      const ids = ((profs as any[]) ?? []).map((p) => p.id);
      // also search auth users by email via listUsers (paged)
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      for (const u of authList?.users ?? []) {
        if (u.email && u.email.toLowerCase().includes(term)) ids.push(u.id);
      }
      const uniq = Array.from(new Set(ids));
      if (!uniq.length) return { rows: [], count: 0 };
      q = q.in("user_id", uniq);
    }
  }

  q = q.order("created_at", { ascending: false });
  const limit = opts.forExport
    ? Math.min(data.limit ?? 10000, 10000)
    : Math.min(data.limit ?? 100, 500);
  const offset = opts.forExport ? 0 : Math.max(data.offset ?? 0, 0);
  q = q.range(offset, offset + limit - 1);

  const { data: rows, count, error } = await q;
  if (error) throw new Error(error.message);
  return { rows: (rows as any[]) ?? [], count: count ?? 0 };
}

export const listAiUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AiUsageFilters) => d ?? {})
  .handler(async ({ data, context }): Promise<AiUsageListResult> => {
    assertAdmin(context.claims);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rows, count } = await queryEvents(data, { forExport: false });

    const emails = await loadUserEmails(rows.map((r) => r.user_id));

    // facets (unfiltered top values, capped)
    const { data: facetRows } = await supabaseAdmin
      .from("ai_usage_events")
      .select("model, feature")
      .order("created_at", { ascending: false })
      .limit(2000);
    const models = new Set<string>();
    const features = new Set<string>();
    for (const r of (facetRows as any[]) ?? []) {
      if (r.model) models.add(r.model);
      if (r.feature) features.add(r.feature);
    }

    // summary over current page
    let errors = 0;
    let latSum = 0;
    let latN = 0;
    let tIn = 0;
    let tOut = 0;
    for (const r of rows) {
      if (r.status !== "ok") errors++;
      if (typeof r.latency_ms === "number") {
        latSum += r.latency_ms;
        latN++;
      }
      tIn += r.tokens_in ?? 0;
      tOut += r.tokens_out ?? 0;
    }

    return {
      rows: rows.map((r) => ({
        id: r.id,
        created_at: r.created_at,
        user_id: r.user_id,
        user_email: r.user_id ? emails.get(r.user_id) ?? null : null,
        feature: r.feature,
        model: r.model,
        tokens_in: r.tokens_in,
        tokens_out: r.tokens_out,
        latency_ms: r.latency_ms,
        status: r.status,
        error: r.error,
        run_id: r.run_id,
      })),
      total: count,
      facets: {
        models: Array.from(models).sort(),
        features: Array.from(features).sort(),
      },
      summary: {
        count: rows.length,
        errors,
        avg_latency_ms: latN ? Math.round(latSum / latN) : 0,
        total_tokens_in: tIn,
        total_tokens_out: tOut,
      },
    };
  });

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const exportAiUsageCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AiUsageFilters) => d ?? {})
  .handler(async ({ data, context }): Promise<{ filename: string; csv: string; count: number }> => {
    assertAdmin(context.claims);
    const { rows } = await queryEvents({ ...data, limit: 10000, offset: 0 }, { forExport: true });
    const emails = await loadUserEmails(rows.map((r) => r.user_id));
    const header = [
      "id","created_at","user_id","user_email","feature","model",
      "tokens_in","tokens_out","latency_ms","status","error","run_id",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.id, r.created_at, r.user_id ?? "", r.user_id ? emails.get(r.user_id) ?? "" : "",
        r.feature, r.model, r.tokens_in ?? "", r.tokens_out ?? "", r.latency_ms ?? "",
        r.status, r.error ?? "", r.run_id ?? "",
      ].map(csvEscape).join(","));
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return {
      filename: `ai-usage-${stamp}.csv`,
      csv: lines.join("\n"),
      count: rows.length,
    };
  });
