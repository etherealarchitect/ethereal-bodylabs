import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Automated SEO validation. Fails loudly if any indexable public route is
 * missing required head metadata or if the sitemap/robots drift out of sync.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const ROUTES_DIR = join(ROOT, "src/routes");
const BASE_URL = "https://ethereal-bodylabs.lovable.app";



// Routes that should be indexed by search engines. Everything else must
// carry a `robots: noindex` meta tag.
const INDEXABLE = new Set(["/", "/pricing"]);

// Map route file -> URL path
function routePath(file: string): string {
  const stem = file.replace(/\.tsx?$/, "");
  if (stem === "index") return "/";
  // Handle escaped-dot files (e.g. sitemap[.]xml)
  const normalized = stem.replace(/\[\.\]/g, ".");
  const withSlashes = normalized.replace(/\./g, "/");
  return "/" + withSlashes.replace(/\/index$/, "");
}

function read(file: string) {
  return readFileSync(join(ROUTES_DIR, file), "utf8");
}

// Only top-level, non-underscore, non-api route files that ship a page.
const publicRouteFiles = readdirSync(ROUTES_DIR).filter((f) => {
  if (!f.endsWith(".tsx")) return false;
  if (f.startsWith("_") || f.startsWith("__")) return false;
  if (f.startsWith("app.") || f === "app.tsx") return false;
  if (f.startsWith("docs.") || f === "design.index.tsx") return false;
  return true;
});

describe("SEO metadata", () => {
  for (const file of publicRouteFiles) {
    const path = routePath(file);
    const src = read(file);

    it(`${path} declares head() with title + description`, () => {
      expect(src).toMatch(/head:\s*\(/);
      expect(src).toMatch(/title:\s*["'`]/);
      expect(src).toMatch(/name:\s*["']description["']/);
    });

    if (INDEXABLE.has(path)) {
      it(`${path} (indexable) has canonical, og:title, og:description, og:url, twitter:card`, () => {
        expect(src).toMatch(/rel:\s*["']canonical["']/);
        expect(src).toMatch(new RegExp(`href:\\s*["']${BASE_URL}${path === "/" ? "/" : path}["']`));
        expect(src).toMatch(/property:\s*["']og:title["']/);
        expect(src).toMatch(/property:\s*["']og:description["']/);
        expect(src).toMatch(/property:\s*["']og:url["']/);
        expect(src).toMatch(/name:\s*["']twitter:card["']/);
      });

      it(`${path} (indexable) MUST NOT declare noindex`, () => {
        expect(src).not.toMatch(/content:\s*["']noindex/i);
      });
    } else {
      it(`${path} (non-indexable) declares robots noindex`, () => {
        expect(src).toMatch(/name:\s*["']robots["'][^}]*noindex/i);
      });
    }
  }
});

describe("sitemap.xml", () => {
  const sitemap = readFileSync(join(ROUTES_DIR, "sitemap[.]xml.ts"), "utf8");

  it("uses the canonical base URL", () => {
    expect(sitemap).toContain(`https://ethereal-bodylabs.lovable.app`);
  });

  it("includes every indexable route exactly once", () => {
    for (const path of INDEXABLE) {
      const matches = sitemap.match(new RegExp(`path:\\s*["']${path}["']`, "g")) ?? [];
      expect(matches.length, `sitemap missing entry for ${path}`).toBe(1);
    }
  });

  it("does not list any noindex/auth-gated route", () => {
    const forbidden = ["/app", "/auth", "/docs", "/forgot-password", "/reset-password", "/checkout"];
    for (const p of forbidden) {
      expect(sitemap).not.toMatch(new RegExp(`path:\\s*["']${p}`));
    }
  });
});

describe("robots.txt", () => {
  const robots = readFileSync(join(ROOT, "public/robots.txt"), "utf8");

  it("allows crawling of the root", () => {
    expect(robots).toMatch(/^User-agent:\s*\*/m);
    expect(robots).toMatch(/^Allow:\s*\//m);
  });

  it("advertises the sitemap", () => {
    expect(robots).toContain(`Sitemap: ${BASE_URL}/sitemap.xml`);
  });

  it("disallows every private/transactional path", () => {
    for (const p of ["/app/", "/auth", "/forgot-password", "/reset-password", "/checkout/", "/docs"]) {
      expect(robots).toMatch(new RegExp(`^Disallow:\\s*${p.replace(/[/]/g, "\\/")}`, "m"));
    }
  });
});
