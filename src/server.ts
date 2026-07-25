import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { BUILD_ID } from "./lib/build-id";

const CRITICAL_CSS_ASSET_FALLBACK = String.raw`
*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"SF Pro Text",sans-serif}body{margin:0;background:#f7f6fb;color:#312d36;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"SF Pro Text",sans-serif;-webkit-font-smoothing:antialiased}button,input,textarea,select{font:inherit}button{appearance:none;border:0;background:transparent;cursor:pointer}button:disabled{cursor:not-allowed}a{color:inherit;text-decoration:none}svg{display:block;vertical-align:middle}img{max-width:100%;height:auto}h1,h2,h3,h4,h5,p{margin:0}:root{--background:#f7f6fb;--foreground:#312d36;--surface-1:#fff;--surface-2:#f6f3f8;--surface-3:#efebf2;--primary:#7b5c92;--primary-foreground:#fff;--muted-foreground:#77717d;--border:#e4dfe8;--input:#e8e3ec;--accent:#efe5f5;--accent-foreground:#4e345e;--destructive:#ba3d2f;--destructive-foreground:#fff;--card:#fff;--card-foreground:#312d36;--popover:#fff;--popover-foreground:#312d36;--secondary:#f1edf4;--secondary-foreground:#3f3945;--radius:.875rem}:where(.hidden){display:none!important}:where(.block){display:block}:where(.inline-flex){display:inline-flex}:where(.flex){display:flex}:where(.grid){display:grid}:where(.relative){position:relative}:where(.absolute){position:absolute}:where(.fixed){position:fixed}:where(.inset-0){inset:0}:where(.inset-y-0){top:0;bottom:0}:where(.right-3){right:.75rem}:where(.z-50){z-index:50}:where(.min-h-screen){min-height:100vh}:where(.h-11){height:2.75rem}:where(.h-px){height:1px}:where(.w-full){width:100%}:where(.flex-1){flex:1 1 0%}:where(.max-w-sm){max-width:24rem}:where(.max-w-md){max-width:28rem}:where(.items-center){align-items:center}:where(.justify-center){justify-content:center}:where(.justify-between){justify-content:space-between}:where(.flex-col){flex-direction:column}:where(.flex-wrap){flex-wrap:wrap}:where(.gap-2){gap:.5rem}:where(.gap-3){gap:.75rem}:where(.gap-4){gap:1rem}:where(.space-y-2)>:not([hidden])~:not([hidden]){margin-top:.5rem}:where(.space-y-3)>:not([hidden])~:not([hidden]){margin-top:.75rem}:where(.mb-1\.5){margin-bottom:.375rem}:where(.mb-8){margin-bottom:2rem}:where(.mt-2){margin-top:.5rem}:where(.mt-3){margin-top:.75rem}:where(.mt-5){margin-top:1.25rem}:where(.mt-6){margin-top:1.5rem}:where(.mt-8){margin-top:2rem}:where(.my-5){margin-top:1.25rem;margin-bottom:1.25rem}:where(.px-3\.5){padding-left:.875rem;padding-right:.875rem}:where(.px-4){padding-left:1rem;padding-right:1rem}:where(.px-5){padding-left:1.25rem;padding-right:1.25rem}:where(.py-2){padding-top:.5rem;padding-bottom:.5rem}:where(.py-10){padding-top:2.5rem;padding-bottom:2.5rem}:where(.pt-1){padding-top:.25rem}:where(.pr-10){padding-right:2.5rem}:where(.rounded-md){border-radius:.375rem}:where(.rounded-xl){border-radius:.75rem}:where(.border){border-width:1px;border-style:solid}:where(.border-border\/60){border-color:rgba(228,223,232,.6)}:where(.border-border){border-color:var(--border)}:where(.bg-background){background-color:var(--background)}:where(.bg-surface-2){background-color:var(--surface-2)}:where(.bg-primary){background-color:var(--primary)}:where(.bg-border\/60){background-color:rgba(228,223,232,.6)}:where(.text-foreground){color:var(--foreground)}:where(.text-primary){color:var(--primary)}:where(.text-primary-foreground){color:var(--primary-foreground)}:where(.text-muted-foreground){color:var(--muted-foreground)}:where(.text-muted-foreground\/80){color:rgba(119,113,125,.8)}:where(.text-muted-foreground\/60){color:rgba(119,113,125,.6)}:where(.text-sm){font-size:.875rem;line-height:1.25rem}:where(.text-xs){font-size:.75rem;line-height:1rem}:where(.text-\[10px\]){font-size:10px}:where(.text-\[11px\]){font-size:11px}:where(.text-3xl){font-size:1.875rem;line-height:2.25rem}:where(.font-medium){font-weight:500}:where(.font-semibold){font-weight:600}:where(.font-mono){font-family:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace}:where(.uppercase){text-transform:uppercase}:where(.tracking-tight){letter-spacing:-.025em}:where(.tracking-wide){letter-spacing:.025em}:where(.tracking-wider){letter-spacing:.05em}:where(.tracking-\[0\.16em\]){letter-spacing:.16em}:where(.tracking-\[0\.18em\]){letter-spacing:.18em}:where(.leading-relaxed){line-height:1.625}:where(.text-center){text-align:center}:where(.outline-none){outline:2px solid transparent;outline-offset:2px}:where(.transition-colors){transition:color .15s ease,background-color .15s ease,border-color .15s ease}:where(.transition-opacity){transition:opacity .15s ease}:where(.shadow-lg){box-shadow:0 20px 40px -14px rgba(37,31,43,.18),0 6px 14px -6px rgba(37,31,43,.1)}:where(.disabled\:opacity-50:disabled){opacity:.5}:where(.placeholder\:text-muted-foreground\/60)::placeholder{color:rgba(119,113,125,.6)}:where(.focus\:border-primary:focus){border-color:var(--primary)}:where(.focus\:ring-2:focus){box-shadow:0 0 0 2px rgba(123,92,146,.3)}:where(.hover\:text-foreground:hover){color:var(--foreground)}:where(.hover\:text-primary:hover){color:var(--primary)}:where(.hover\:border-primary:hover){border-color:var(--primary)}:where(.hover\:opacity-90:hover){opacity:.9}:where(.size-4){width:1rem;height:1rem}
`;

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Force HTTPS: honor Cloudflare's x-forwarded-proto and redirect any
      // http:// hit to the https:// equivalent before SSR runs.
      const url = new URL(request.url);
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const isHttp = url.protocol === "http:" || forwardedProto === "http";
      if (isHttp && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        url.protocol = "https:";
        return new Response(null, {
          status: 301,
          headers: {
            location: url.toString(),
            "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
          },
        });
      }

      // Apple requires the AASA file at /.well-known/apple-app-site-association
      // (or /apple-app-site-association at the root). Rewrite to the existing
      // TanStack server route so Universal Links + webcredentials resolve.
      if (
        url.pathname === "/.well-known/apple-app-site-association" ||
        url.pathname === "/apple-app-site-association"
      ) {
        const rewritten = new URL(url);
        rewritten.pathname = "/api/public/apple-app-site-association";
        request = new Request(rewritten.toString(), request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      if (isMissingStylesheetResponse(normalized, url)) {
        return withCacheAndSecurityHeaders(
          new Response(CRITICAL_CSS_ASSET_FALLBACK, {
            status: 200,
            headers: {
              "content-type": "text/css; charset=utf-8",
              "cache-control": "no-cache, must-revalidate, max-age=0",
              "x-css-fallback": "critical",
            },
          }),
          url,
        );
      }
      return withCacheAndSecurityHeaders(normalized, url);

    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

const HSTS = "max-age=63072000; includeSubDomains; preload";

// Static asset extensions that never change once deployed (bundler-hashed)
// are handled by the built-in /assets/* pipeline. This list covers loose
// files in public/ that are safe to cache aggressively at the edge.
const LONG_LIVED_EXT = /\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm)$/i;
const HASHED_STYLESHEET_PATH = /^\/assets\/styles-[^/]+\.css$/;

function isMissingStylesheetResponse(response: Response, url: URL): boolean {
  if (!HASHED_STYLESHEET_PATH.test(url.pathname)) return false;
  if (response.status === 404 || response.status === 410) return true;
  const contentType = response.headers.get("content-type") ?? "";
  return response.status >= 400 || contentType.includes("text/html");
}

function withCacheAndSecurityHeaders(response: Response, url: URL): Response {
  const headers = new Headers(response.headers);
  const pathname = url.pathname;

  if (!headers.has("strict-transport-security")) {
    headers.set("strict-transport-security", HSTS);
  }
  headers.set("x-build-id", BUILD_ID);

  // Fix Web App Manifest content-type (some builds emit octet-stream).
  if (pathname.endsWith(".webmanifest")) {
    headers.set("content-type", "application/manifest+json; charset=utf-8");
  }

  // Cache-control policy per resource class. Only set when the origin
  // didn't already specify one (respect explicit no-cache from framework).
  if (!headers.has("cache-control")) {
    if (pathname === "/sw.js" || pathname === "/service-worker.js") {
      headers.set("cache-control", "no-cache, no-store, must-revalidate");
    } else if (
      pathname.endsWith(".webmanifest") ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
    ) {
      headers.set("cache-control", "public, max-age=300, must-revalidate");
    } else if (pathname.startsWith("/api/")) {
      headers.set("cache-control", "no-store");
    } else if (LONG_LIVED_EXT.test(pathname)) {
      headers.set(
        "cache-control",
        "public, max-age=86400, stale-while-revalidate=604800",
      );
    }
  }

  // Ensure HTML navigations always revalidate — never let a proxy pin an
  // old shell that references pruned CSS/JS chunks.
  const contentType = headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    headers.set("cache-control", "no-cache, must-revalidate, max-age=0");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

