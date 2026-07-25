import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminGate } from "@/components/AdminGate";
import { Card, PageHeader } from "@/components/app/AppShell";
import { toast } from "sonner";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import { listAiUsage, exportAiUsageCsv, type AiUsageFilters } from "@/lib/ai-usage.functions";

export const Route = createFileRoute("/app/admin/ai-usage")({
  component: () => (
    <AdminGate>
      <AiUsagePage />
    </AdminGate>
  ),
});

const initial: AiUsageFilters = {
  model: "",
  feature: "",
  user: "",
  status: "all",
  minLatency: 0,
  minTokens: 0,
  from: "",
  to: "",
  limit: 100,
  offset: 0,
};

function AiUsagePage() {
  const [filters, setFilters] = useState<AiUsageFilters>(initial);
  const list = useServerFn(listAiUsage);
  const exp = useServerFn(exportAiUsageCsv);

  const cleaned = useMemo<AiUsageFilters>(() => {
    const c: AiUsageFilters = { ...filters };
    if (!c.model) delete c.model;
    if (!c.feature) delete c.feature;
    if (!c.user) delete c.user;
    if (c.status === "all") delete c.status;
    if (!c.minLatency) delete c.minLatency;
    if (!c.minTokens) delete c.minTokens;
    if (!c.from) delete c.from;
    if (!c.to) delete c.to;
    return c;
  }, [filters]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["ai-usage", cleaned],
    queryFn: () => list({ data: cleaned }),
  });

  const [exporting, setExporting] = useState(false);
  async function onExport() {
    setExporting(true);
    try {
      const res = await exp({ data: cleaned });
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.count} events`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const update = <K extends keyof AiUsageFilters>(k: K, v: AiUsageFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v, offset: 0 }));

  const page = Math.floor((filters.offset ?? 0) / (filters.limit ?? 100));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / (filters.limit ?? 100))) : 1;

  return (
    <div>
      <PageHeader
        eyebrow="Admin · AI Usage"
        title="AI Usage Events"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface-2 h-9 px-3 text-xs hover:border-primary"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground h-9 px-3 text-xs disabled:opacity-50"
            >
              <Download className="size-3.5" /> {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Model">
            <select
              value={filters.model ?? ""}
              onChange={(e) => update("model", e.target.value)}
              className="input"
            >
              <option value="">All</option>
              {data?.facets.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Feature">
            <select
              value={filters.feature ?? ""}
              onChange={(e) => update("feature", e.target.value)}
              className="input"
            >
              <option value="">All</option>
              {data?.facets.features.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="User (email or uuid)">
            <input
              value={filters.user ?? ""}
              onChange={(e) => update("user", e.target.value)}
              placeholder="user@example.com"
              className="input"
            />
          </Field>
          <Field label="Status">
            <select
              value={filters.status ?? "all"}
              onChange={(e) => update("status", e.target.value as any)}
              className="input"
            >
              <option value="all">All</option>
              <option value="ok">OK</option>
              <option value="error">Errors only</option>
            </select>
          </Field>
          <Field label="Min latency (ms)">
            <input type="number" min={0} value={filters.minLatency ?? 0}
              onChange={(e) => update("minLatency", Number(e.target.value) || 0)}
              className="input" />
          </Field>
          <Field label="Min tokens out">
            <input type="number" min={0} value={filters.minTokens ?? 0}
              onChange={(e) => update("minTokens", Number(e.target.value) || 0)}
              className="input" />
          </Field>
          <Field label="From">
            <input type="datetime-local" value={filters.from ?? ""}
              onChange={(e) => update("from", e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="input" />
          </Field>
          <Field label="To">
            <input type="datetime-local" value={filters.to ?? ""}
              onChange={(e) => update("to", e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="input" />
          </Field>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setFilters(initial)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset filters
          </button>
        </div>
      </Card>

      {/* Summary */}
      {data && (
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
          <Mini label="Rows" value={`${data.summary.count} / ${data.total}`} />
          <Mini label="Errors" value={data.summary.errors.toString()} accent={data.summary.errors > 0} />
          <Mini label="Avg latency" value={`${data.summary.avg_latency_ms} ms`} />
          <Mini label="Tokens in" value={data.summary.total_tokens_in.toLocaleString()} />
          <Mini label="Tokens out" value={data.summary.total_tokens_out.toLocaleString()} />
        </div>
      )}

      {/* Table */}
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-xs">
          <thead className="bg-surface-2 text-left uppercase tracking-wider text-[10px] text-muted-foreground">
            <tr>
              <Th>Time</Th><Th>User</Th><Th>Feature</Th><Th>Model</Th>
              <Th className="text-right">Tok in</Th><Th className="text-right">Tok out</Th>
              <Th className="text-right">Latency</Th><Th>Status</Th><Th>Error</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : data && data.rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No events match these filters.</td></tr>
            ) : data?.rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-surface-2/50">
                <Td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</Td>
                <Td className="max-w-[180px] truncate" title={r.user_email ?? r.user_id ?? ""}>
                  {r.user_email ?? (r.user_id ? r.user_id.slice(0, 8) : "—")}
                </Td>
                <Td>{r.feature}</Td>
                <Td className="font-mono">{r.model}</Td>
                <Td className="text-right tabular-nums">{r.tokens_in ?? "—"}</Td>
                <Td className="text-right tabular-nums">{r.tokens_out ?? "—"}</Td>
                <Td className="text-right tabular-nums">{r.latency_ms != null ? `${r.latency_ms}ms` : "—"}</Td>
                <Td>
                  {r.status === "ok" ? (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-green-600">ok</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-red-600">
                      <AlertCircle className="size-3" />{r.status}
                    </span>
                  )}
                </Td>
                <Td className="max-w-[280px] truncate text-red-600" title={r.error ?? ""}>{r.error ?? ""}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div>Page {page + 1} of {totalPages}</div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-border/60 bg-surface-2 h-8 px-3 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setFilters((f) => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - (f.limit ?? 100)) }))}
          >Prev</button>
          <button
            className="rounded-lg border border-border/60 bg-surface-2 h-8 px-3 disabled:opacity-40"
            disabled={page + 1 >= totalPages}
            onClick={() => setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 100) }))}
          >Next</button>
        </div>
      </div>

      <style>{`.input{height:36px;width:100%;border-radius:8px;border:1px solid hsl(var(--border)/.6);background:hsl(var(--surface-2));padding:0 10px;font-size:12px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 ${className}`}>{children}</th>;
}
function Td({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <td className={`px-3 py-2 ${className}`} title={title}>{children}</td>;
}
function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-red-500/40 bg-red-500/5" : "border-border/60 bg-surface-2"}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
