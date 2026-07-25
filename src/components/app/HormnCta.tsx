import hormnLogo from "@/assets/hormn-logo.png.asset.json";

/**
 * HORMN TRT assessment CTA. Displayed under the profile avatar box.
 * Opens the HORMN partner assessment in a new tab.
 */
export function HormnCta() {
  return (
    <a
      href="https://hormn.com.au"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 block group"
    >
      <div className="mb-2 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          HORMN TRT Assessment
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 p-5 transition-all group-hover:border-primary/60 group-hover:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.4)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">
              Check your TRT eligibility
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Clinician-reviewed assessment. Results in minutes.
            </div>
          </div>
          <img
            src={hormnLogo.url}
            alt="HORMN"
            className="h-8 w-auto object-contain shrink-0"
          />
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] text-muted-foreground">
        Free of charge, in partnership with Ethereal Bodylabs.
      </div>
    </a>
  );
}
