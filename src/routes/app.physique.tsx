import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { SectionTabs, LAB_TABS } from "@/components/app/SectionTabs";
import { Plus, Trash2, Camera, Download, X, RotateCcw } from "lucide-react";
import {
  buildComparisonCollage, downloadBlob, reencodeImage, saveCollageToHistory,
  preloadCollageImages, renderCollageToCanvas, canvasToJpegBlob,
  defaultCollageOptions, type CollageOptions, type PreloadedCollage,
} from "@/lib/collage";
import { toast } from "sonner";

export const Route = createFileRoute("/app/physique")({
  component: PhysiquePage,
});



function PhysiquePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [waist, setWaist] = useState("");
  const [busy, setBusy] = useState(false);
  const [preloaded, setPreloaded] = useState<PreloadedCollage | null>(null);
  const [collageOptions, setCollageOptions] = useState<CollageOptions>(defaultCollageOptions);
  const [savingCollage, setSavingCollage] = useState(false);




  const { data: photos } = useQuery({
    queryKey: ["photos", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("physique_photos")
        .select("*").order("taken_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: measurements } = useQuery({
    queryKey: ["measurements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("measurements")
        .select("*").order("taken_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const addMeasurement = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("measurements").insert({
        user_id: user.id,
        weight_kg: weight ? Number(weight) : null,
        body_fat_pct: bf ? Number(bf) : null,
        waist_cm: waist ? Number(waist) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      setWeight(""); setBf(""); setWaist("");
    },
  });

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("physique").upload(path, file);
      if (upErr) throw upErr;
      const takenAt = new Date().toISOString();
      const { data: inserted, error } = await supabase.from("physique_photos").insert({
        user_id: user.id, storage_path: path, taken_at: takenAt,
      }).select().single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["photos"] });

      // Auto-generate start-vs-current collage
      try {
        const { data: startRows } = await supabase.from("physique_photos")
          .select("id, storage_path, taken_at")
          .order("taken_at", { ascending: true })
          .limit(1);
        const start = startRows?.[0];
        if (start && start.storage_path !== path) {
          const pre = await preloadCollageImages(
            { id: start.id, storage_path: start.storage_path, taken_at: start.taken_at },
            { id: inserted?.id, storage_path: path, taken_at: inserted?.taken_at ?? takenAt },
          );
          setCollageOptions(defaultCollageOptions);
          setPreloaded(pre);
        }
      } catch (err) {
        console.error("collage failed", err);
      }

    } finally { setBusy(false); e.target.value = ""; }
  }



  const delPhoto = useMutation({
    mutationFn: async (photo: { id: string; storage_path: string }) => {
      await supabase.storage.from("physique").remove([photo.storage_path]);
      await supabase.from("physique_photos").delete().eq("id", photo.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  });

  function closeCollage() {
    setPreloaded(null);
    setCollageOptions(defaultCollageOptions);
  }

  async function saveCurrentCollage() {
    if (!preloaded || !user) return;
    setSavingCollage(true);
    try {
      const canvas = document.createElement("canvas");
      renderCollageToCanvas(canvas, preloaded, collageOptions);
      const blob = await canvasToJpegBlob(canvas);
      const rec = await saveCollageToHistory(user.id, blob, preloaded.start, preloaded.current);
      if (rec) qc.invalidateQueries({ queryKey: ["collages"] });
      toast.success("Collage saved to history");
      closeCollage();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSavingCollage(false);
    }
  }

  async function downloadCurrent(format: "jpg" | "png") {
    if (!preloaded) return;
    const canvas = document.createElement("canvas");
    renderCollageToCanvas(canvas, preloaded, collageOptions);
    const jpg = await canvasToJpegBlob(canvas);
    const out = format === "png" ? await reencodeImage(jpg, "png") : jpg;
    downloadBlob(out, `progress-${Date.now()}.${format}`);
  }

  return (
    <div>
      <PageHeader eyebrow="Lab" title="Physique" />
      <SectionTabs items={LAB_TABS} />

      {preloaded && (
        <CollageEditorModal
          preloaded={preloaded}
          options={collageOptions}
          onChange={setCollageOptions}
          onClose={closeCollage}
          onSave={saveCurrentCollage}
          onDownload={downloadCurrent}
          saving={savingCollage}
        />
      )}








      <Card className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Log measurement</div>
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="Weight kg" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary" />
          <input placeholder="BF %" value={bf} onChange={(e) => setBf(e.target.value)} inputMode="decimal"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary" />
          <input placeholder="Waist cm" value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-2 text-sm text-center outline-none focus:border-primary" />
        </div>
        <button onClick={() => addMeasurement.mutate()} disabled={!weight && !bf && !waist}
          className="mt-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
          Save
        </button>
      </Card>

      <Card className="mb-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium">Upload progress photo</div>
            <div className="text-xs text-muted-foreground">Private to your account.</div>
          </div>
          <span className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1">
            <Camera className="size-3.5" /> {busy ? "…" : "Pick"}
          </span>
          <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} className="hidden" />
        </label>
      </Card>

      <div className="mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Photos</div>
        {!photos?.length ? (
          <EmptyState title="No photos yet." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => <PhotoTile key={p.id} photo={p} onDelete={() => delPhoto.mutate(p)} />)}
          </div>
        )}
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">Measurement history</div>
        {!measurements?.length ? (
          <EmptyState title="No measurements yet." />
        ) : (
          <div className="space-y-1.5">
            {measurements.map((m) => (
              <Card key={m.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{new Date(m.taken_at).toLocaleDateString()}</span>
                  <span className="font-mono">{m.weight_kg ?? "—"}kg · {m.body_fat_pct ?? "—"}% · {m.waist_cm ?? "—"}cm</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoTile({ photo, onDelete }: { photo: { id: string; storage_path: string; taken_at: string }; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("physique").createSignedUrl(photo.storage_path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [photo.storage_path]);
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-border/60 bg-surface-2">
      {url && <img src={url} alt="Progress" className="size-full object-cover" />}
      <button onClick={onDelete} className="absolute top-1 right-1 rounded-md bg-background/80 p-1 text-muted-foreground hover:text-destructive">
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function CollageEditorModal({
  preloaded, options, onChange, onClose, onSave, onDownload, saving,
}: {
  preloaded: PreloadedCollage;
  options: CollageOptions;
  onChange: (o: CollageOptions) => void;
  onClose: () => void;
  onSave: () => void;
  onDownload: (f: "jpg" | "png") => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [side, setSide] = useState<"left" | "right">("left");

  useEffect(() => {
    if (canvasRef.current) renderCollageToCanvas(canvasRef.current, preloaded, options);
  }, [preloaded, options]);

  const meta = useMemo(() => ({
    start: new Date(preloaded.start.taken_at).toLocaleDateString(),
    current: new Date(preloaded.current.taken_at).toLocaleDateString(),
  }), [preloaded]);

  const panel = options[side];
  function updatePanel(patch: Partial<typeof panel>) {
    onChange({ ...options, [side]: { ...panel, ...patch } });
  }
  function resetPanel() {
    onChange({ ...options, [side]: { zoom: 1, ox: 0.5, oy: 0.5 } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-w-lg w-full max-h-[92vh] overflow-y-auto rounded-2xl bg-background border border-border/60" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 sticky top-0 bg-background z-10">
          <div>
            <div className="text-sm font-medium">Start vs Current</div>
            <div className="text-xs text-muted-foreground font-mono">{meta.start} → {meta.current}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-2"><X className="size-4" /></button>
        </div>

        <canvas ref={canvasRef} className="w-full block bg-black" />

        <div className="p-3 space-y-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground flex-1">Adjust panel</div>
            <div className="inline-flex rounded-lg border border-border/60 overflow-hidden text-xs">
              <button onClick={() => setSide("left")}
                className={`px-3 h-8 ${side === "left" ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}>Start</button>
              <button onClick={() => setSide("right")}
                className={`px-3 h-8 ${side === "right" ? "bg-primary text-primary-foreground" : "bg-surface-2"}`}>Current</button>
            </div>
            <button onClick={resetPanel} title="Reset panel"
              className="p-1.5 rounded-lg border border-border/60 hover:bg-surface-2"><RotateCcw className="size-3.5" /></button>
          </div>

          <SliderRow label="Zoom" value={panel.zoom} min={1} max={3} step={0.05}
            onChange={(v) => updatePanel({ zoom: v })} format={(v) => `${v.toFixed(2)}×`} />
          <SliderRow label="Horizontal" value={panel.ox} min={0} max={1} step={0.01}
            onChange={(v) => updatePanel({ ox: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={panel.zoom <= 1} />
          <SliderRow label="Vertical" value={panel.oy} min={0} max={1} step={0.01}
            onChange={(v) => updatePanel({ oy: v })} format={(v) => `${Math.round(v * 100)}%`} disabled={panel.zoom <= 1} />

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">Labels</div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(["top", "bottom", "none"] as const).map((p) => (
                <button key={p} onClick={() => onChange({ ...options, labelPosition: p })}
                  className={`h-9 rounded-lg border capitalize ${options.labelPosition === p ? "bg-primary text-primary-foreground border-primary" : "border-border/60 bg-surface-2"}`}>
                  {p === "none" ? "Hide" : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 flex gap-2 border-t border-border/60 sticky bottom-0 bg-background">
          <button onClick={() => onDownload("jpg")}
            className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5">
            <Download className="size-4" /> JPG
          </button>
          <button onClick={() => onDownload("png")}
            className="flex-1 h-10 rounded-lg border border-border/60 text-sm font-medium inline-flex items-center justify-center gap-1.5">
            <Download className="size-4" /> PNG
          </button>
          <button onClick={onSave} disabled={saving}
            className="h-10 px-3 rounded-lg border border-border/60 text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange, format, disabled,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string; disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40" : ""}`}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary" />
    </label>
  );
}

