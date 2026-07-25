import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Liquid Glass — Apple-inspired form & surface primitives.
 * Materials over color. All tokens are semantic; never hardcode.
 */

export function GlassCard({
  children,
  className = "",
  as: Tag = "div",
  strong,
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  strong?: boolean;
}) {
  return (
    <Tag className={cn("rounded-2xl p-5", strong ? "glass-strong" : "glass", className)}>
      {children}
    </Tag>
  );
}

type BtnVariant = "primary" | "glass" | "ghost" | "destructive";
type BtnSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium tap select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:brightness-105 active:brightness-95",
  glass:
    "glass text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_5%,var(--glass-tint))]",
  ghost:
    "text-foreground/80 hover:bg-secondary hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:brightness-105",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export const GlassButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: BtnSize;
    block?: boolean;
  }
>(function GlassButton({ variant = "primary", size = "md", block, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], block && "w-full", className)}
      {...rest}
    />
  );
});

/**
 * GlassField — Apple-style grouped list row wrapping an input.
 * Use inside a GlassList for a clean iOS Settings feel.
 */
export const GlassInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function GlassInput({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-surface-1 px-3.5 text-[15px] text-foreground",
        "placeholder:text-muted-foreground/70",
        "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring",
        "aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:ring-destructive/30",
        "transition-colors",
        className,
      )}
      {...rest}
    />
  );
});

export function GlassField({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[12px] font-medium text-muted-foreground"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <div className="text-[12px] text-destructive">{error}</div>
      ) : hint ? (
        <div className="text-[12px] text-muted-foreground/80">{hint}</div>
      ) : null}
    </div>
  );
}

/**
 * GlassList — iOS-style grouped list container. Rows stack with hairline dividers.
 */
export function GlassList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass overflow-hidden rounded-2xl divide-y divide-border/60",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassRow({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp: React.ElementType = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-[15px]",
        onClick && "tap hover:bg-secondary/60",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/**
 * GlassSegmented — iOS segmented control.
 */
export function GlassSegmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-grid gap-1 rounded-full p-1 glass",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-8 rounded-full px-3 text-[13px] font-medium tap transition-colors",
              active
                ? "bg-surface-1 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * GlassSheet — bottom sheet / modal shell with a Liquid Glass surface.
 */
export function GlassSheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-5 sm:m-4 max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="mb-3 text-center text-[13px] font-semibold text-foreground">
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
