import * as React from "react";

export type ChartPoint = { x: number; y: number; label?: string };

export type Range = "7d" | "30d" | "90d" | "1y" | "all";

export function RangeToggle({
  value,
  onChange,
  options = ["7d", "30d", "90d", "1y", "all"] as Range[],
}: {
  value: Range;
  onChange: (r: Range) => void;
  options?: Range[];
}) {
  return (
    <div className="inline-flex rounded-full border border-border/60 bg-surface-1/70 p-0.5 text-[10px] font-mono">
      {options.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2.5 py-1 rounded-full uppercase tracking-wider transition ${
            value === r
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/**
 * Interactive chart with hover/touch scrubbing, delta pill, sparkline gradient,
 * goal line, milestone markers, and animated draw-in.
 *
 * `direction`: "down" = lower is better (weight-cut), "up" = higher is better.
 */
export function InteractiveChart({
  points,
  height = 180,
  unit = "",
  goal,
  direction = "up",
  color = "hsl(var(--primary))",
  formatValue,
}: {
  points: ChartPoint[];
  height?: number;
  unit?: string;
  goal?: number;
  direction?: "up" | "down";
  color?: string;
  formatValue?: (n: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [drawn, setDrawn] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const gradId = React.useId();

  React.useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 30);
    return () => clearTimeout(t);
  }, []);

  const fmt = formatValue ?? ((n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1)));

  if (!points.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground"
        style={{ height }}
      >
        <div className="text-2xl">📈</div>
        <div>Log an entry to unlock this chart.</div>
      </div>
    );
  }

  const w = 340;
  const h = height;
  const padX = 10;
  const padY = 18;

  const ys = points.map((p) => p.y);
  const min = Math.min(...ys, goal ?? Infinity);
  const max = Math.max(...ys, goal ?? -Infinity);
  const span = max - min || 1;
  const step = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padX + i * step;
    const y = padY + (1 - (p.y - min) / span) * (h - padY * 2);
    return { x, y, p };
  });

  const path = coords
    .map(({ x, y }, i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const area =
    coords.length > 1
      ? `${path} L${coords[coords.length - 1].x},${h - padY} L${coords[0].x},${h - padY} Z`
      : "";

  const first = points[0].y;
  const last = points[points.length - 1].y;
  const delta = last - first;
  const positive = direction === "up" ? delta >= 0 : delta <= 0;
  const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;

  // Milestone detection: index where absolute change first crossed 5%, 10%, 25% thresholds.
  const milestones: { idx: number; pct: number }[] = [];
  if (points.length > 2) {
    let hitPcts = new Set<number>();
    for (let i = 1; i < points.length; i++) {
      if (first === 0) break;
      const chg = Math.abs((points[i].y - first) / first) * 100;
      for (const pct of [5, 10, 25]) {
        if (chg >= pct && !hitPcts.has(pct)) {
          hitPcts.add(pct);
          milestones.push({ idx: i, pct });
        }
      }
    }
  }

  const goalY = goal != null ? padY + (1 - (goal - min) / span) * (h - padY * 2) : null;

  // Progress toward goal (0..1)
  let progress: number | null = null;
  if (goal != null && first !== goal) {
    const total = Math.abs(goal - first);
    const done = direction === "down" ? first - last : last - first;
    progress = Math.max(0, Math.min(1, done / total));
  }

  const activeIdx = hoverIdx ?? points.length - 1;
  const active = coords[activeIdx];

  const handleMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * w;
    let closest = 0;
    let bestDist = Infinity;
    coords.forEach(({ x }, i) => {
      const d = Math.abs(x - relX);
      if (d < bestDist) {
        bestDist = d;
        closest = i;
      }
    });
    setHoverIdx(closest);
  };

  return (
    <div className="select-none">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-3xl font-semibold tabular-nums leading-none">
            {fmt(active.p.y)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
          </div>
          {active.p.label && (
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">{active.p.label}</div>
          )}
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono ${
            positive
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
          }`}
          title={`${delta > 0 ? "+" : ""}${fmt(delta)} ${unit} since first entry`}
        >
          <span>{delta >= 0 ? "▲" : "▼"}</span>
          <span className="tabular-nums">{fmt(Math.abs(delta))}</span>
          <span className="opacity-70">{unit}</span>
          {isFinite(deltaPct) && Math.abs(deltaPct) > 0.1 && (
            <span className="opacity-70">({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(1)}%)</span>
          )}
        </div>
      </div>

      {progress != null && goal != null && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span className="uppercase tracking-wider">Goal · {fmt(goal)} {unit}</span>
            <span className="tabular-nums text-foreground">{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700 ease-out"
              style={{ width: drawn ? `${progress * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full touch-none"
        preserveAspectRatio="none"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchMove={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={w - padX}
            y1={padY + f * (h - padY * 2)}
            y2={padY + f * (h - padY * 2)}
            stroke="hsl(var(--border))"
            strokeOpacity="0.35"
            strokeDasharray="2 4"
          />
        ))}

        {/* goal line */}
        {goalY != null && (
          <>
            <line
              x1={padX}
              x2={w - padX}
              y1={goalY}
              y2={goalY}
              stroke={color}
              strokeOpacity="0.5"
              strokeDasharray="4 4"
            />
            <text
              x={w - padX - 2}
              y={goalY - 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
              fill={color}
              opacity="0.7"
            >
              GOAL
            </text>
          </>
        )}

        {/* area */}
        {area && (
          <path
            d={area}
            fill={`url(#${gradId})`}
            style={{
              opacity: drawn ? 1 : 0,
              transition: "opacity 600ms ease-out",
            }}
          />
        )}

        {/* line with draw-in */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: drawn ? 0 : 2000,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />

        {/* milestones */}
        {milestones.map(({ idx, pct }) => {
          const c = coords[idx];
          if (!c) return null;
          return (
            <g key={`ms-${pct}`}>
              <circle cx={c.x} cy={c.y} r={5} fill={color} opacity="0.15">
                <animate attributeName="r" from="4" to="9" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={c.x} cy={c.y} r={3} fill={color} />
              <text
                x={c.x}
                y={c.y - 8}
                textAnchor="middle"
                fontSize="8"
                fontFamily="ui-monospace, monospace"
                fill={color}
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* active point + crosshair */}
        {hoverIdx != null && (
          <line
            x1={active.x}
            x2={active.x}
            y1={padY}
            y2={h - padY}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="2 2"
          />
        )}
        <circle
          cx={active.x}
          cy={active.y}
          r={4}
          fill="hsl(var(--background))"
          stroke={color}
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}

/** Animated circular progress ring for compact goal cards. */
export function ProgressRing({
  value,
  max,
  size = 68,
  strokeWidth = 6,
  label,
  sublabel,
  color = "hsl(var(--primary))",
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}) {
  const [drawn, setDrawn] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 30);
    return () => clearTimeout(t);
  }, []);
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={drawn ? c * (1 - pct) : c}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold tabular-nums leading-none">
            {Math.round(pct * 100)}%
          </div>
          {sublabel && (
            <div className="mt-0.5 text-[9px] font-mono text-muted-foreground">{sublabel}</div>
          )}
        </div>
      </div>
      {label && (
        <div className="mt-1 text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
          {label}
        </div>
      )}
    </div>
  );
}

/** Github-style contribution grid for workout consistency. */
export function ConsistencyGrid({
  days,
  color = "hsl(var(--primary))",
}: {
  /** map of yyyy-mm-dd -> intensity 0..1 */
  days: Record<string, number>;
  color?: string;
}) {
  const today = new Date();
  const cells: { date: string; intensity: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, intensity: days[key] ?? 0 });
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
      {cells.map((c) => (
        <div
          key={c.date}
          title={`${c.date}${c.intensity > 0 ? " · logged" : ""}`}
          className="aspect-square rounded-[3px] border border-border/40"
          style={{
            background:
              c.intensity > 0
                ? `color-mix(in oklab, ${color} ${20 + c.intensity * 70}%, transparent)`
                : "hsl(var(--secondary))",
          }}
        />
      ))}
    </div>
  );
}
