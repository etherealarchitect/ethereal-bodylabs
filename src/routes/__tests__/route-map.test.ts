import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static route-map audit. Verifies every route file's createFileRoute("/...")
 * string matches its filename, and that every route with a loader also has
 * errorComponent + notFoundComponent so runtime failures never blank the app.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const ROUTES_DIR = join(ROOT, "src/routes");

function pathFromFilename(file: string): string {
  const stem = file.replace(/\.tsx?$/, "").replace(/\.ts$/, "");
  if (stem === "__root") return "__root";
  if (stem === "index") return "/";
  // Preserve escaped-dot literals (e.g. `sitemap[.]xml`) before the dot->slash swap.
  const marker = "\u0000";
  const preserved = stem.replace(/\[\.\]/g, marker);
  const withSlashes = preserved.replace(/\./g, "/").replace(new RegExp(marker, "g"), ".");
  const cleaned = "/" + withSlashes.replace(/\/index$/, "");
  return cleaned;
}

function walk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue;
    if (entry.isDirectory()) {
      out.push(...walk(join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name));
    } else if (/\.(tsx?|ts)$/.test(entry.name)) {
      out.push(prefix ? `${prefix}/${entry.name}` : entry.name);
    }
  }
  return out;
}

const routeFiles = walk(ROUTES_DIR).filter(
  (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
);

describe("Route map", () => {
  for (const file of routeFiles) {
    const src = readFileSync(join(ROUTES_DIR, file), "utf8");
    const flatName = file.replace(/\//g, ".");
    const expected = pathFromFilename(flatName);

    if (flatName === "__root.tsx") {
      it("__root uses createRootRoute*", () => {
        expect(src).toMatch(/createRootRoute/);
      });
      continue;
    }

    // Skip api/ routes for path-string verification (nested folder based).
    if (file.startsWith("api/")) continue;

    it(`${file} declares createFileRoute matching filename`, () => {
      const match = src.match(/createFileRoute\(\s*["']([^"']+)["']/);
      expect(match, `no createFileRoute in ${file}`).toBeTruthy();
      const declared = match![1].replace(/\/$/, "") || "/";
      const normalizedExpected = expected.replace(/\/$/, "") || "/";
      expect(declared).toBe(normalizedExpected);
    });

    // Every route with a loader must define both boundaries.
    if (/\bloader\s*:/.test(src)) {
      it(`${file} defines errorComponent + notFoundComponent`, () => {
        expect(src, `errorComponent missing in ${file}`).toMatch(/errorComponent\s*:/);
        expect(src, `notFoundComponent missing in ${file}`).toMatch(/notFoundComponent\s*:/);
      });
    }
  }

  it("__root has notFoundComponent", () => {
    const src = readFileSync(join(ROUTES_DIR, "__root.tsx"), "utf8");
    expect(src).toMatch(/notFoundComponent\s*:/);
  });

  it("router config sets defaultErrorComponent", () => {
    const routerSrc = readFileSync(resolve(ROOT, "src/router.tsx"), "utf8");
    expect(routerSrc).toMatch(/defaultErrorComponent/);
  });
});
