import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { CacheManager } from "@/components/app/CacheManager";
import { BUILD_ID } from "@/lib/build-id";
import { initNative } from "@/lib/native/init";

const CRITICAL_CSS_FALLBACK = String.raw`
*,*::before,*::after{box-sizing:border-box}html{-webkit-text-size-adjust:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"SF Pro Text",sans-serif}body{margin:0;background:#f7f6fb;color:#312d36;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"SF Pro Text",sans-serif;-webkit-font-smoothing:antialiased}button,input,textarea,select{font:inherit}button{appearance:none;border:0;background:transparent;cursor:pointer}button:disabled{cursor:not-allowed}a{color:inherit;text-decoration:none}svg{display:block;vertical-align:middle}img{max-width:100%;height:auto}h1,h2,h3,h4,h5,p{margin:0}:root{--background:#f7f6fb;--foreground:#312d36;--surface-1:#fff;--surface-2:#f6f3f8;--surface-3:#efebf2;--primary:#7b5c92;--primary-foreground:#fff;--muted-foreground:#77717d;--border:#e4dfe8;--input:#e8e3ec;--accent:#efe5f5;--accent-foreground:#4e345e;--destructive:#ba3d2f;--destructive-foreground:#fff;--card:#fff;--card-foreground:#312d36;--popover:#fff;--popover-foreground:#312d36;--secondary:#f1edf4;--secondary-foreground:#3f3945;--radius:.875rem}
:where(.hidden){display:none!important}:where(.block){display:block}:where(.inline-flex){display:inline-flex}:where(.flex){display:flex}:where(.grid){display:grid}:where(.relative){position:relative}:where(.absolute){position:absolute}:where(.fixed){position:fixed}:where(.inset-0){inset:0}:where(.inset-y-0){top:0;bottom:0}:where(.right-3){right:.75rem}:where(.z-50){z-index:50}:where(.min-h-screen){min-height:100vh}:where(.h-11){height:2.75rem}:where(.h-px){height:1px}:where(.w-full){width:100%}:where(.flex-1){flex:1 1 0%}:where(.max-w-sm){max-width:24rem}:where(.max-w-md){max-width:28rem}:where(.items-center){align-items:center}:where(.justify-center){justify-content:center}:where(.justify-between){justify-content:space-between}:where(.flex-col){flex-direction:column}:where(.flex-wrap){flex-wrap:wrap}:where(.gap-2){gap:.5rem}:where(.gap-3){gap:.75rem}:where(.gap-4){gap:1rem}:where(.space-y-2)>:not([hidden])~:not([hidden]){margin-top:.5rem}:where(.space-y-3)>:not([hidden])~:not([hidden]){margin-top:.75rem}:where(.mb-1\.5){margin-bottom:.375rem}:where(.mb-8){margin-bottom:2rem}:where(.mt-2){margin-top:.5rem}:where(.mt-3){margin-top:.75rem}:where(.mt-5){margin-top:1.25rem}:where(.mt-6){margin-top:1.5rem}:where(.mt-8){margin-top:2rem}:where(.my-5){margin-top:1.25rem;margin-bottom:1.25rem}:where(.px-3\.5){padding-left:.875rem;padding-right:.875rem}:where(.px-4){padding-left:1rem;padding-right:1rem}:where(.px-5){padding-left:1.25rem;padding-right:1.25rem}:where(.py-2){padding-top:.5rem;padding-bottom:.5rem}:where(.py-10){padding-top:2.5rem;padding-bottom:2.5rem}:where(.pt-1){padding-top:.25rem}:where(.pr-10){padding-right:2.5rem}:where(.rounded-md){border-radius:.375rem}:where(.rounded-xl){border-radius:.75rem}:where(.border){border-width:1px;border-style:solid}:where(.border-border\/60){border-color:rgba(228,223,232,.6)}:where(.border-border){border-color:var(--border)}:where(.bg-background){background-color:var(--background)}:where(.bg-surface-2){background-color:var(--surface-2)}:where(.bg-primary){background-color:var(--primary)}:where(.bg-border\/60){background-color:rgba(228,223,232,.6)}:where(.text-foreground){color:var(--foreground)}:where(.text-primary){color:var(--primary)}:where(.text-primary-foreground){color:var(--primary-foreground)}:where(.text-muted-foreground){color:var(--muted-foreground)}:where(.text-muted-foreground\/80){color:rgba(119,113,125,.8)}:where(.text-muted-foreground\/60){color:rgba(119,113,125,.6)}:where(.text-sm){font-size:.875rem;line-height:1.25rem}:where(.text-xs){font-size:.75rem;line-height:1rem}:where(.text-\[10px\]){font-size:10px}:where(.text-\[11px\]){font-size:11px}:where(.text-3xl){font-size:1.875rem;line-height:2.25rem}:where(.font-medium){font-weight:500}:where(.font-semibold){font-weight:600}:where(.font-mono){font-family:"JetBrains Mono",ui-monospace,"SF Mono",Menlo,monospace}:where(.uppercase){text-transform:uppercase}:where(.tracking-tight){letter-spacing:-.025em}:where(.tracking-wide){letter-spacing:.025em}:where(.tracking-wider){letter-spacing:.05em}:where(.tracking-\[0\.16em\]){letter-spacing:.16em}:where(.tracking-\[0\.18em\]){letter-spacing:.18em}:where(.leading-relaxed){line-height:1.625}:where(.text-center){text-align:center}:where(.outline-none){outline:2px solid transparent;outline-offset:2px}:where(.transition-colors){transition:color .15s ease,background-color .15s ease,border-color .15s ease}:where(.transition-opacity){transition:opacity .15s ease}:where(.shadow-lg){box-shadow:0 20px 40px -14px rgba(37,31,43,.18),0 6px 14px -6px rgba(37,31,43,.1)}:where(.disabled\:opacity-50:disabled){opacity:.5}:where(.placeholder\:text-muted-foreground\/60)::placeholder{color:rgba(119,113,125,.6)}:where(.focus\:border-primary:focus){border-color:var(--primary)}:where(.focus\:ring-2:focus){box-shadow:0 0 0 2px rgba(123,92,146,.3)}:where(.hover\:text-foreground:hover){color:var(--foreground)}:where(.hover\:text-primary:hover){color:var(--primary)}:where(.hover\:border-primary:hover){border-color:var(--primary)}:where(.hover\:opacity-90:hover){opacity:.9}:where(.size-4){width:1rem;height:1rem}
`;

const CSS_RECOVERY_SCRIPT = String.raw`(function(){var build=${JSON.stringify(BUILD_ID)};var key='ebl-css-recovery-'+build;function clearBrowserCaches(){try{if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister().catch(function(){})})}).catch(function(){})}if(typeof caches!=='undefined'){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k).catch(function(){})})}).catch(function(){})}}catch(e){}}function hasMainSheet(){try{return Array.from(document.styleSheets||[]).some(function(s){var href=s.href||'';if(!(/\/assets\/styles-|\/src\/styles\.css/.test(href)))return false;if(s.disabled)return false;try{return !!s.cssRules&&s.cssRules.length>20}catch(e){return !!s.ownerNode&&!!s.ownerNode.sheet}})}catch(e){return false}}function utilitiesWork(){try{var p=document.createElement('div');p.className='hidden bg-background text-foreground';document.body.appendChild(p);var cs=getComputedStyle(p);var root=getComputedStyle(document.documentElement);var ok=cs.display==='none'&&root.getPropertyValue('--background').trim().length>0;document.body.removeChild(p);return ok}catch(e){return false}}function healthy(){return hasMainSheet()&&utilitiesWork()}function bustStyles(){try{Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function(link){var href=link.getAttribute('href')||'';if(!(/\/assets\/styles-|\/src\/styles\.css/.test(href)))return;var clone=link.cloneNode();var url=new URL(link.href,location.href);url.searchParams.set('_cssv',build+'-'+Date.now().toString(36));clone.href=url.toString();clone.setAttribute('data-ebl-css-recovery','true');document.head.appendChild(clone)})}catch(e){}}function stripRecoveryParams(){try{var url=new URL(location.href);if(url.searchParams.has('_css_reset')||url.searchParams.has('_r')){url.searchParams.delete('_css_reset');url.searchParams.delete('_r');history.replaceState(history.state,'',url.toString())}}catch(e){}}function recover(){clearBrowserCaches();var n=0;try{n=Number(sessionStorage.getItem(key)||'0')}catch(e){}if(n>=2)return;try{sessionStorage.setItem(key,String(n+1))}catch(e){}bustStyles();setTimeout(function(){if(healthy()){stripRecoveryParams();return}try{var url=new URL(location.href);url.searchParams.set('_css_reset',build);url.searchParams.set('_r',Date.now().toString(36));location.replace(url.toString())}catch(e){location.reload()}},900)}function check(){if(healthy()){stripRecoveryParams();return}recover()}clearBrowserCaches();window.addEventListener('pageshow',function(){setTimeout(check,700)});window.addEventListener('load',function(){setTimeout(check,1000)});})();`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#f7f6fb" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Ethereal" },
      { name: "format-detection", content: "telephone=no" },
      { name: "author", content: "ETHEREAL BODYLABS" },
      { name: "ebl-build", content: BUILD_ID },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },

    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style
          data-ebl-critical-css="true"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: CRITICAL_CSS_FALLBACK }}
        />
        <HeadContent />
        {/*
         * Belt-and-suspenders: proactively unregister any stale service
         * worker and wipe its caches on every page load. The previous
         * caching SW served a stale app shell without the current CSS
         * <link>, which rendered auth/marketing pages completely unstyled.
         * Runs before hydration so recovery happens on the very first paint.
         */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: CSS_RECOVERY_SCRIPT }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Service worker registration removed intentionally. The previous caching
  // SW served a stale app shell without the current CSS link. The shell's
  // inline script unregisters any lingering registration on load; do not
  // re-register here.


  // Keep router + query cache in sync with auth state.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  // Bootstrap Capacitor native runtime (no-op on web).
  useEffect(() => {
    void initNative(router);
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <InstallPrompt />
      <CacheManager />
      <Toaster theme="light" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
