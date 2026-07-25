import * as React from "react";

/** Minimalist SVG line chart. Values in insertion order (oldest → newest). */
export function LineChart({
  values,
  labels,
  height = 120,
  color = "hsl(var(--primary) / 0.95)",
  fill = "hsl(var(--primary) / 0.15)",
  unit = "",
}: {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
  fill?: string;
  unit?: string;
}) {
  if (!values.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground"
        style={{ height }}
      >
        Not enough data yet.
      </div>
    );
  }
  const w = 320;
  const h = height;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${h - pad} L${points[0][0]},${h - pad} Z`;
  const last = values[values.length - 1];
  const first = values[0];
  const delta = last - first;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-2xl font-semibold tabular-nums">
          {formatNum(last)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        </div>
        <div
          className={`font-mono text-[11px] ${delta >= 0 ? "text-success" : "text-destructive"}`}
        >
          {delta >= 0 ? "▲" : "▼"} {formatNum(Math.abs(delta))} {unit}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2} fill={color} />
        ))}
      </svg>
      {labels && labels.length > 0 && (
        <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

function formatNum(n: number) {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
