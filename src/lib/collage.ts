// Build a start-vs-current side-by-side comparison collage on a canvas.
import { supabase } from "@/integrations/supabase/client";

export type CollagePhoto = { id?: string; storage_path: string; taken_at: string };


async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("physique")
    .createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("signed url failed");
  return data.signedUrl;
}

export type PanelAdjust = { zoom: number; ox: number; oy: number };
export type CollageOptions = {
  left: PanelAdjust;
  right: PanelAdjust;
  labelPosition: "top" | "bottom" | "none";
};

export const defaultPanelAdjust: PanelAdjust = { zoom: 1, ox: 0.5, oy: 0.5 };
export const defaultCollageOptions: CollageOptions = {
  left: { ...defaultPanelAdjust },
  right: { ...defaultPanelAdjust },
  labelPosition: "bottom",
};

function drawPanel(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  adj: PanelAdjust = defaultPanelAdjust,
) {
  const zoom = Math.max(1, adj.zoom || 1);
  const ir = img.width / img.height;
  const tr = w / h;
  // Base cover crop
  let baseSw = img.width, baseSh = img.height;
  if (ir > tr) baseSw = img.height * tr;
  else baseSh = img.width / tr;
  // Zoom shrinks the source rect
  const sw = baseSw / zoom;
  const sh = baseSh / zoom;
  const maxSx = img.width - sw;
  const maxSy = img.height - sh;
  const sx = Math.max(0, Math.min(maxSx, maxSx * clamp01(adj.ox)));
  const sy = Math.max(0, Math.min(maxSy, maxSy * clamp01(adj.oy)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function weeksBetween(a: string, b: string) {
  return Math.max(
    0,
    Math.round(
      (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 7),
    ),
  );
}

export type PreloadedCollage = {
  start: CollagePhoto;
  current: CollagePhoto;
  startImg: HTMLImageElement;
  currImg: HTMLImageElement;
};

export async function preloadCollageImages(
  start: CollagePhoto,
  current: CollagePhoto,
): Promise<PreloadedCollage> {
  const [startUrl, currUrl] = await Promise.all([
    signedUrl(start.storage_path),
    signedUrl(current.storage_path),
  ]);
  const [startImg, currImg] = await Promise.all([
    loadImage(startUrl),
    loadImage(currUrl),
  ]);
  return { start, current, startImg, currImg };
}

export function renderCollageToCanvas(
  canvas: HTMLCanvasElement,
  pre: PreloadedCollage,
  options: CollageOptions = defaultCollageOptions,
) {
  const W = 1600;
  const H = 2000;
  const pad = 40;
  const gap = 24;
  const headerH = 160;
  const footerH = 120;
  const panelW = (W - pad * 2 - gap) / 2;
  const panelH = H - headerH - footerH - pad;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0b0b10";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 56px -apple-system, system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("Progress", pad, 48);

  const weeks = weeksBetween(pre.start.taken_at, pre.current.taken_at);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "500 28px ui-monospace, monospace";
  ctx.fillText(
    `${weeks} week${weeks === 1 ? "" : "s"} apart · Ethereal Bodylabs`,
    pad,
    112,
  );

  const panelY = headerH;
  drawPanel(ctx, pre.startImg, pad, panelY, panelW, panelH, options.left);
  drawPanel(ctx, pre.currImg, pad + panelW + gap, panelY, panelW, panelH, options.right);

  if (options.labelPosition !== "none") {
    const labels: Array<[string, string, number]> = [
      ["START", fmtDate(pre.start.taken_at), pad],
      ["CURRENT", fmtDate(pre.current.taken_at), pad + panelW + gap],
    ];
    const boxH = 100;
    const boxY = options.labelPosition === "top" ? panelY : panelY + panelH - boxH;
    for (const [label, date, x] of labels) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, boxY, panelW, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 32px -apple-system, system-ui, sans-serif";
      ctx.fillText(label, x + 24, boxY + 12);
      ctx.fillStyle = "#e4e4e7";
      ctx.font = "500 24px ui-monospace, monospace";
      ctx.fillText(date, x + 24, boxY + 56);
    }
  }

  ctx.fillStyle = "#71717a";
  ctx.font = "500 22px ui-monospace, monospace";
  ctx.fillText("etherealbodylab.app", pad, H - footerH + 32);
}

export async function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92,
    ),
  );
}

export async function buildComparisonCollage(
  start: CollagePhoto,
  current: CollagePhoto,
  options: CollageOptions = defaultCollageOptions,
): Promise<Blob> {
  const pre = await preloadCollageImages(start, current);
  const canvas = document.createElement("canvas");
  renderCollageToCanvas(canvas, pre, options);
  return await canvasToJpegBlob(canvas);
}


export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Re-encode any image blob into the requested format via canvas. */
export async function reencodeImage(
  source: Blob,
  format: "png" | "jpg",
  quality = 0.95,
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (format === "jpg") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mime = format === "png" ? "image/png" : "image/jpeg";
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        mime,
        format === "png" ? undefined : quality,
      ),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Fetch a signed URL and download it in the requested format. */
export async function downloadCollageAs(
  signedUrl: string,
  format: "png" | "jpg",
  basename: string,
) {
  const res = await fetch(signedUrl);
  const srcBlob = await res.blob();
  const out = format === "jpg" && srcBlob.type === "image/jpeg"
    ? srcBlob
    : await reencodeImage(srcBlob, format);
  downloadBlob(out, `${basename}.${format}`);
}


/** Upload the collage to storage and record it in the history table. */
export async function saveCollageToHistory(
  userId: string,
  blob: Blob,
  start: CollagePhoto,
  current: CollagePhoto,
): Promise<{ id: string; storage_path: string } | null> {
  const path = `${userId}/collages/${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("physique")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (upErr) {
    console.error("collage upload failed", upErr);
    return null;
  }
  const weeks = Math.max(
    0,
    Math.round(
      (new Date(current.taken_at).getTime() - new Date(start.taken_at).getTime()) /
        (1000 * 60 * 60 * 24 * 7),
    ),
  );
  const { data, error } = await supabase
    .from("physique_collages")
    .insert({
      user_id: userId,
      storage_path: path,
      start_photo_id: start.id ?? null,
      current_photo_id: current.id ?? null,
      start_taken_at: start.taken_at,
      current_taken_at: current.taken_at,
      weeks_apart: weeks,
    })
    .select("id, storage_path")
    .single();
  if (error) {
    console.error("collage record failed", error);
    return null;
  }
  return data;
}

