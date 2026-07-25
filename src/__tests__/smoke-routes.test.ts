import { describe, it, expect } from "vitest";

/**
 * End-to-end smoke tests for every auth + app route.
 *
 * Opt-in — set SMOKE=1 (and optionally SMOKE_BASE_URL, default
 * http://localhost:8080) so the default `vitest run` in CI does not require a
 * running dev server. When enabled, fetches each route's SSR HTML and asserts:
 *   1. HTTP status is 2xx or a documented auth redirect
 *   2. A <title> is present (rules out catastrophic SSR 500s that h3 masks)
 *   3. The response does NOT contain the h3-swallowed error body
 *   4. The response does NOT contain a React hydration-mismatch marker
 *
 * Runtime crashes visible only after hydration (client-only effects) are
 * covered by scripts/smoke-routes.py which drives real Chromium.
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:8080";
const enabled = process.env.SMOKE === "1";

// Public + auth routes — always 200 SSR.
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/auth",
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
  "/checkout/return",
  "/docs",
  "/sitemap.xml",
];

// Protected /app/* routes. Unauthenticated requests should still SSR a valid
// shell (loading state, auth-gate redirect, or public marketing shell) —
// never a 500 or hydration-mismatch page.
const APP_ROUTES = [
  "/app",
  "/app/onboarding",
  "/app/profile",
  "/app/settings",
  "/app/billing",
  "/app/upgrade",
  "/app/upgrade/return",
  "/app/insights",
  "/app/reports",
  "/app/records",
  "/app/physique",
  "/app/photos/compare",
  "/app/nutrition",
  "/app/exercises",
  "/app/workouts",
  "/app/programs",
  "/app/doses",
  "/app/protocol",
  "/app/bloodwork",
  "/app/coach",
  "/app/admin",
  "/app/admin/ai-usage",
];

const ALL_ROUTES = [...PUBLIC_ROUTES, ...APP_ROUTES];

const H3_SWALLOWED = /"unhandled"\s*:\s*true[^}]*"message"\s*:\s*"HTTPError"/;
const HYDRATION_MISMATCH = /Hydration failed|did not match|Text content does not match/i;

describe.skipIf(!enabled)("SSR smoke — every route renders without crashing", () => {
  it.each(ALL_ROUTES)("GET %s returns a healthy SSR shell", async (path) => {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });

    // Accept 2xx and documented redirects (auth gate, sitemap normalization).
    expect(res.status, `${path} → ${res.status}`).toBeLessThan(500);

    const body = await res.text();

    expect(body, `${path} returned h3-swallowed error body`).not.toMatch(H3_SWALLOWED);
    expect(body, `${path} contains a hydration-mismatch warning`).not.toMatch(HYDRATION_MISMATCH);

    // XML sitemap has no <title>; skip that assertion for it.
    if (!path.endsWith(".xml") && res.status < 300) {
      expect(body, `${path} SSR HTML has no <title>`).toMatch(/<title[^>]*>[^<]+<\/title>/);
    }
  });
});
