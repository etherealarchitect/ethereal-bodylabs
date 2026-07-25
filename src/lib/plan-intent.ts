// Persist the checkout plan intent across the entire auth flow — including
// OAuth round-trips and the email-verification magic link, which may open in
// a different tab where the /auth search params are gone.
//
// Precedence for resolving the intent: explicit URL search param > sessionStorage
// > localStorage. Storage is cleared once the intent has been consumed by
// redirecting to /app/upgrade (or intentionally to /app for the free plan).

import { z } from "zod";

export const PlanSchema = z.enum(["free", "premium_monthly", "premium_yearly"]);
export type PlanIntent = z.infer<typeof PlanSchema>;

/**
 * Validate a plan value coming from an untrusted source (URL, storage, form).
 * Returns `{ plan }` when valid, `{ planInvalid: true }` when the value was
 * present but unrecognised, and `{}` when absent. Suitable for both
 * client-side `validateSearch` and any server-side handler.
 */
export function parsePlanInput(
  raw: unknown,
): { plan?: PlanIntent; planInvalid?: true } {
  if (raw === undefined || raw === null || raw === "") return {};
  const parsed = PlanSchema.safeParse(raw);
  if (parsed.success) return { plan: parsed.data };
  return { planInvalid: true };
}

const KEY = "ebl.planIntent.v1";

function isPlan(v: unknown): v is PlanIntent {
  return PlanSchema.safeParse(v).success;
}

export function savePlanIntent(plan: PlanIntent | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (!plan) return;
    window.sessionStorage.setItem(KEY, plan);
    window.localStorage.setItem(KEY, plan);
  } catch {}
}

export function readPlanIntent(): PlanIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const s = window.sessionStorage.getItem(KEY);
    if (isPlan(s)) return s;
    const l = window.localStorage.getItem(KEY);
    if (isPlan(l)) return l;
  } catch {}
  return null;
}

export function clearPlanIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(KEY);
  } catch {}
}

/** Append `?plan=…` to a URL so email/OAuth redirects preserve intent. */
export function withPlan(url: string, plan: PlanIntent | null | undefined): string {
  if (!plan) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    u.searchParams.set("plan", plan);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}plan=${encodeURIComponent(plan)}`;
  }
}
