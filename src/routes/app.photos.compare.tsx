import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/app/AppShell";
import { ArrowLeft, ArrowLeftRight, Download, Trash2, X, History } from "lucide-react";
import { downloadCollageAs } from "@/lib/collage";
import { toast } from "sonner";

export const Route = createFileRoute("/app/photos/compare")({
  component: ComparePage,
});


type Photo = {
  id: string;
  taken_at: string;
  storage_path: string;
  pose: string | null;
  notes: string | null;
};

type TimelineEntry = Photo & {
  /** ms since epoch */
  t: number;
  /** week index from the earliest photo; 0 = Start */
  weekIndex: number;
  /** Human label: "Start" or "Week N" */
  bucketLabel: string;
  /** Position 0..1 across the timeline */
  position: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildTimeline(photos: Photo[]): TimelineEntry[] {
  if (!photos.length) return [];
  const sorted = [...photos].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
  );
  const startT = new Date(sorted[0].taken_at).getTime();
  const endT = new Date(sorted[sorted.length - 1].taken_at).getTime();
  const span = Math.max(1, endT - startT);
  return sorted.map((p) => {
    const t = new Date(p.taken_at).getTime();
    const weekIndex = Math.round((t - startT) / WEEK_MS);
    return {
      ...p,
      t,
      weekIndex,
      bucketLabel: weekIndex === 0 ? "Start" : `Week ${weekIndex}`,
      position: (t - startT) / span,
    };
  });
}

function ComparePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: photos } = useQuery({
    queryKey: ["photos-compare", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("physique_photos")
        .select("*")
        .order("taken_at", { ascending: true });
      return (data ?? []) as Photo[];
    },
  });

  const timeline = useMemo(() => buildTimeline(photos ?? []), [photos]);

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useEffect(() => {
    if (!timeline.length) return;
    setLeftId((prev) => prev ?? timeline[0].id);
    setRightId((prev) => prev ?? timeline[timeline.length - 1].id);
  }, [timeline]);

  const left = timeline.find((p) => p.id === leftId) ?? null;
  const right = timeline.find((p) => p.id === rightId) ?? null;

  const deltaLabel = useMemo(() => {
    if (!left || !right) return null;
    const days = Math.round(Math.abs(right.t - left.t) / (24 * 60 * 60 * 1000));
    if (days === 0) return "Same day";
    if (days < 14) return `${days} day${days === 1 ? "" : "s"} apart`;
    const weeks = Math.round(days / 7);
    return `${weeks} weeks apart`;
  }, [left, right]);

  function swap() {
    setLeftId(right?.id ?? null);
    setRightId(left?.id ?? null);
  }

  return (
    <div>
      <Link
        to="/app/physique"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-3"
      >
        <ArrowLeft className="size-3.5" /> Physique
      </Link>
      <PageHeader eyebrow="Lab" title="Compare" />

      {timeline.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Upload at least two photos to compare.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Panel entry={left} side="Before" />
            <Panel entry={right} side="After" />
          </div>

          <div className="flex items-center justify-between mb-4 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>{deltaLabel}</span>
            <button
              type="button"
              onClick={swap}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface-2 px-2.5 py-1 text-foreground hover:border-primary"
              aria-label="Swap left and right photos"
            >
              <ArrowLeftRight className="size-3" /> Swap
            </button>
          </div>

          <Timeline
            entries={timeline}
            leftId={leftId}
            rightId={rightId}
            onPick={(id) => {
              // Tap semantics: reassign the endpoint closest in time to the tapped photo.
              if (!leftId || !rightId) {
                if (!leftId) setLeftId(id);
                else setRightId(id);
                return;
              }
              const target = timeline.find((p) => p.id === id);
              const l = timeline.find((p) => p.id === leftId);
              const r = timeline.find((p) => p.id === rightId);
              if (!target || !l || !r) return;
              if (id === leftId || id === rightId) return;
              const distL = Math.abs(target.t - l.t);
              const distR = Math.abs(target.t - r.t);
              if (distL <= distR) setLeftId(id);
              else setRightId(id);
            }}
          />

          <PhotoPicker
            label="Before"
            entries={timeline}
            value={leftId}
            onChange={setLeftId}
          />
          <PhotoPicker
            label="After"
            entries={timeline}
            value={rightId}
            onChange={setRightId}
          />
        </>
      )}

      <CollageHistory userId={user?.id} qc={qc} />
    </div>
  );
}

type CollageRow = {
  id: string;
  storage_path: string;
  start_taken_at: string;
  current_taken_at: string;
  weeks_apart: number | null;
  created_at: string;
};

function CollageHistory({
  userId,
  qc,
}: {
  userId: string | undefined;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: collages } = useQuery({
    queryKey: ["collages", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physique_collages")
        .select("id, storage_path, start_taken_at, current_taken_at, weeks_apart, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollageRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (row: CollageRow) => {
      await supabase.storage.from("physique").remove([row.storage_path]);
      const { error } = await supabase.from("physique_collages").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collages"] });
      toast.success("Collage removed");
      setOpenId(null);
    },
  });

  if (!collages?.length) return null;
  const open = collages.find((c) => c.id === openId) ?? null;

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <History className="size-3" /> Collage history
      </div>
      <div className="grid grid-cols-3 gap-2">
        {collages.map((c) => (
          <CollageThumb key={c.id} row={c} onOpen={() => setOpenId(c.id)} />
        ))}
      </div>

      {open && (
        <CollageViewer
          row={open}
          onClose={() => setOpenId(null)}
          onDelete={() => del.mutate(open)}
        />
      )}
    </div>
  );
}

function useSignedUrl(path: string | null | undefined, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("physique")
      .createSignedUrl(path, expiresIn)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path, expiresIn]);
  return url;
}

function CollageThumb({ row, onOpen }: { row: CollageRow; onOpen: () => void }) {
  const url = useSignedUrl(row.storage_path);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border/60 bg-surface-2 text-left"
    >
      {url && <img src={url} alt="Progress collage" className="size-full object-cover" />}
      <div className="absolute inset-x-0 bottom-0 bg-black/55 p-1.5 text-[9px] font-mono uppercase tracking-wider text-white">
        {row.weeks_apart ?? 0}w · {new Date(row.created_at).toLocaleDateString()}
      </div>
    </button>
  );
}

function CollageViewer({
  row,
  onClose,
  onDelete,
}: {
  row: CollageRow;
  onClose: () => void;
  onDelete: () => void;
}) {
  const url = useSignedUrl(row.storage_path);

  const basename = `progress-${new Date(row.created_at).toISOString().slice(0, 10)}`;

  async function handleDownload(format: "jpg" | "png") {
    if (!url) return;
    try {
      await downloadCollageAs(url, format, basename);
    } catch {
      toast.error("Download failed");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Start vs Current</div>
            <div className="font-mono text-xs text-muted-foreground">
              {new Date(row.start_taken_at).toLocaleDateString()} →{" "}
              {new Date(row.current_taken_at).toLocaleDateString()}
              {row.weeks_apart != null ? ` · ${row.weeks_apart}w` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        {url ? (
          <img src={url} alt="Progress collage" className="block w-full bg-black" />
        ) : (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
        <div className="flex gap-2 p-3">
          <button
            type="button"
            onClick={() => handleDownload("jpg")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            <Download className="size-4" /> JPG
          </button>
          <button
            type="button"
            onClick={() => handleDownload("png")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 text-sm font-medium"
          >
            <Download className="size-4" /> PNG
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-sm text-muted-foreground hover:text-destructive"
            aria-label="Delete collage"
          >
            <Trash2 className="size-4" />
          </button>
        </div>


      </div>
    </div>
  );
}


function Panel({ entry, side }: { entry: TimelineEntry | null; side: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!entry) {
      setUrl(null);
      return;
    }
    supabase.storage
      .from("physique")
      .createSignedUrl(entry.storage_path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [entry?.storage_path]);
  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 bg-surface-2 aspect-[3/4] relative">
      {url && <img src={url} className="size-full object-cover" alt="" />}
      <div className="absolute top-2 left-2 rounded-full bg-black/50 backdrop-blur text-white px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
        {side}
      </div>
      {entry && (
        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white p-2 text-[10px] font-mono flex items-center justify-between">
          <span className="uppercase tracking-wider">{entry.bucketLabel}</span>
          <span>{new Date(entry.taken_at).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}

function Timeline({
  entries,
  leftId,
  rightId,
  onPick,
}: {
  entries: TimelineEntry[];
  leftId: string | null;
  rightId: string | null;
  onPick: (id: string) => void;
}) {
  const first = entries[0];
  const last = entries[entries.length - 1];
  return (
    <div className="mb-5 rounded-2xl border border-border/60 bg-surface-2/60 p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        <span>Timeline</span>
        <span>
          {new Date(first.taken_at).toLocaleDateString()} →{" "}
          {new Date(last.taken_at).toLocaleDateString()}
        </span>
      </div>
      <div className="relative h-12">
        {/* baseline */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/70" />
        {/* range highlight between the two selected points */}
        {leftId && rightId && (() => {
          const l = entries.find((p) => p.id === leftId);
          const r = entries.find((p) => p.id === rightId);
          if (!l || !r) return null;
          const lo = Math.min(l.position, r.position) * 100;
          const hi = Math.max(l.position, r.position) * 100;
          return (
            <div
              className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-primary/60 rounded-full"
              style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%` }}
            />
          );
        })()}
        {entries.map((p) => {
          const isLeft = p.id === leftId;
          const isRight = p.id === rightId;
          const active = isLeft || isRight;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              title={`${p.bucketLabel} — ${new Date(p.taken_at).toLocaleDateString()}`}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${p.position * 100}%` }}
              aria-label={`Select ${p.bucketLabel}, ${new Date(p.taken_at).toLocaleDateString()}`}
            >
              <span
                className={
                  "block rounded-full border transition-all " +
                  (active
                    ? "size-3.5 border-primary bg-primary shadow-[0_0_0_4px] shadow-primary/20"
                    : "size-2.5 border-border/80 bg-background hover:border-primary hover:bg-primary/30")
                }
              />
              {active && (
                <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-primary">
                  {isLeft ? "Before" : "After"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhotoPicker({
  label,
  entries,
  value,
  onChange,
}: {
  label: string;
  entries: TimelineEntry[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mt-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {entries.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`shrink-0 rounded-lg border-2 px-2 py-1 text-left text-[10px] font-mono leading-tight ${
              value === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-surface-2 text-muted-foreground"
            }`}
          >
            <div className="uppercase tracking-wider">{p.bucketLabel}</div>
            <div>{new Date(p.taken_at).toLocaleDateString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
