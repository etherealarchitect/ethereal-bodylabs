import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { analyzeBloodReport } from "@/lib/bloodwork.functions";
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Download, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/app/bloodwork")({
  head: () => ({
    meta: [
      { title: "Bloodwork — ETHEREAL BODYLABS" },
      { name: "description", content: "Upload an Australian blood test panel and receive an evidence-based, medically framed insight report." },
    ],
  }),
  component: BloodworkPage,
});

type Report = {
  id: string;
  file_name: string | null;
  file_mime: string | null;
  status: string;
  summary: string | null;
  markers: any;
  analysis_md: string | null;
  collected_on: string | null;
  lab_name: string | null;
  error: string | null;
  created_at: string;
  file_path: string;
};

function BloodworkPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeBloodReport);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reports } = useQuery({
    queryKey: ["blood_reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
    refetchInterval: (q) => {
      const arr = (q.state.data as Report[] | undefined) ?? [];
      return arr.some((r) => r.status === "pending" || r.status === "processing") ? 4000 : false;
    },
  });

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true); setMsg(null);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("bloodwork").upload(path, file, {
        contentType: file.type || "application/pdf",
      });
      if (up.error) throw up.error;
      const ins = await supabase.from("blood_reports").insert({
        user_id: user.id,
        file_path: path,
        file_name: file.name,
        file_mime: file.type || "application/pdf",
        status: "processing",
      }).select("id").single();
      if (ins.error) throw ins.error;

      qc.invalidateQueries({ queryKey: ["blood_reports"] });
      await analyze({ data: { reportId: ins.data.id } });
      qc.invalidateQueries({ queryKey: ["blood_reports"] });
      setMsg("Report ready.");
      setOpenId(ins.data.id);
    } catch (err: any) {
      setMsg(err?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  const del = useMutation({
    mutationFn: async (r: Report) => {
      await supabase.storage.from("bloodwork").remove([r.file_path]);
      await supabase.from("blood_reports").delete().eq("id", r.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blood_reports"] }),
  });

  const open = reports?.find((r) => r.id === openId) ?? null;

  return (
    <div>
      <PageHeader eyebrow="Lab" title="Bloodwork" />

      <Card className="mb-4">
        <div className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Upload AU pathology panel
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            PDF or clear photo of your lab report. Analysed against standard AU reference ranges. Educational, not a diagnosis.
          </div>
        </div>
        <label className="h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer inline-flex items-center justify-center gap-2 w-full disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? "Analysing…" : "Choose file"}
          <input type="file" accept="application/pdf,image/*" onChange={onUpload} className="hidden" disabled={busy} />
        </label>
        {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}
      </Card>

      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        History
      </div>
      {!reports?.length ? (
        <EmptyState title="No reports yet." hint="Upload your first panel to see personalised insights." />
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <button className="flex-1 text-left" onClick={() => setOpenId(r.id)}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-primary" />
                    {r.file_name ?? "Blood panel"}
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} · <StatusPill status={r.status} />
                  </div>
                  {r.summary && <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.summary}</div>}
                  {r.error && <div className="mt-2 text-xs text-destructive">{r.error}</div>}
                </button>
                <button onClick={() => del.mutate(r)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <ReportModal report={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; Icon: any; label: string }> = {
    pending: { c: "text-muted-foreground", Icon: Loader2, label: "Queued" },
    processing: { c: "text-primary", Icon: Loader2, label: "Analysing" },
    ready: { c: "text-emerald-400", Icon: CheckCircle2, label: "Ready" },
    error: { c: "text-destructive", Icon: AlertCircle, label: "Error" },
  };
  const s = map[status] ?? map.pending;
  const spin = status === "processing" || status === "pending";
  return (
    <span className={`inline-flex items-center gap-1 ${s.c}`}>
      <s.Icon className={`size-3 ${spin ? "animate-spin" : ""}`} /> {s.label}
    </span>
  );
}

function ReportModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const markers = Array.isArray(report.markers) ? report.markers : [];

  function downloadPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const M = 48;
    let y = M;

    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("Blood Panel Report", M, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(120);
    doc.text(`ETHEREAL BODYLABS · ${new Date(report.created_at).toLocaleDateString()}`, M, y); y += 14;
    if (report.lab_name) { doc.text(`Lab: ${report.lab_name}`, M, y); y += 12; }
    if (report.collected_on) { doc.text(`Collected: ${report.collected_on}`, M, y); y += 12; }
    y += 8;

    if (report.summary) {
      doc.setTextColor(0); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Summary", M, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const lines = doc.splitTextToSize(report.summary, W - M * 2);
      doc.text(lines, M, y); y += lines.length * 12 + 10;
    }

    if (markers.length) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Markers", M, y); y += 14;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      for (const m of markers) {
        if (y > 780) { doc.addPage(); y = M; }
        const line = `${m.name}: ${m.value}${m.unit ? " " + m.unit : ""}${m.range ? "  (ref " + m.range + ")" : ""}  [${m.flag ?? ""}]`;
        const lines = doc.splitTextToSize(line, W - M * 2);
        doc.text(lines, M, y); y += lines.length * 11 + 2;
      }
      y += 10;
    }

    if (report.analysis_md) {
      if (y > 720) { doc.addPage(); y = M; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Full report", M, y); y += 14;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const paragraphs = report.analysis_md.split(/\n\n+/);
      for (const p of paragraphs) {
        const clean = p.replace(/[#*_`>]/g, "").trim();
        if (!clean) continue;
        const lines = doc.splitTextToSize(clean, W - M * 2);
        if (y + lines.length * 12 > 800) { doc.addPage(); y = M; }
        doc.text(lines, M, y); y += lines.length * 12 + 8;
      }
    }

    doc.setFontSize(8); doc.setTextColor(140);
    doc.text("Educational only — not a diagnosis. Discuss with your GP.", M, 820);

    doc.save(`bloodwork-${report.created_at.slice(0, 10)}.pdf`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-lg overflow-y-auto" onClick={onClose}>
      <div className="max-w-2xl mx-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Blood report</div>
            <h2 className="text-xl font-semibold">{report.file_name ?? "Panel"}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadPdf} disabled={report.status !== "ready"}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40">
              <Download className="size-3.5" /> PDF
            </button>
            <button onClick={onClose} className="rounded-lg border border-border/60 px-3 py-2 text-xs">Close</button>
          </div>
        </div>

        {report.status !== "ready" ? (
          <Card>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Analysing your panel — this takes 20–60 seconds.
            </div>
            {report.error && <div className="mt-2 text-xs text-destructive">{report.error}</div>}
          </Card>
        ) : (
          <>
            {report.summary && (
              <Card className="mb-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary mb-1">Summary</div>
                <div className="text-sm leading-relaxed">{report.summary}</div>
              </Card>
            )}
            {markers.length > 0 && (
              <Card className="mb-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary mb-2">Markers</div>
                <div className="divide-y divide-border/40">
                  {markers.map((m: any, i: number) => (
                    <div key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <div>
                        <div className="font-medium">{m.name}</div>
                        {m.range && <div className="text-[11px] text-muted-foreground font-mono">ref {m.range}</div>}
                      </div>
                      <div className="text-right">
                        <div className="tabular-nums font-mono">{m.value}{m.unit ? ` ${m.unit}` : ""}</div>
                        <FlagPill flag={m.flag} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {report.analysis_md && (
              <Card>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary mb-2">Full report</div>
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {report.analysis_md}
                </div>
              </Card>
            )}
            <div className="mt-4 text-[11px] text-muted-foreground">
              Educational only — not a medical diagnosis. Review with your GP or specialist.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FlagPill({ flag }: { flag?: string }) {
  const map: Record<string, string> = {
    optimal: "text-emerald-400",
    normal: "text-emerald-400/80",
    watch: "text-amber-400",
    high: "text-destructive",
    low: "text-destructive",
    unknown: "text-muted-foreground",
  };
  const c = map[flag ?? "unknown"] ?? "text-muted-foreground";
  return <div className={`text-[10px] font-mono uppercase tracking-wider ${c}`}>{flag ?? ""}</div>;
}
