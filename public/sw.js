// Kill-switch service worker.
// Replaces the previous caching SW. Any browser that still has the old worker
// registered will:
//   1. hit this new file on the next update check
//   2. install → skipWaiting → activate → wipe caches → claim clients
//   3. force every open window to reload against the network
//   4. unregister itself so no future navigation is intercepted
//
// The fetch handler is required so that during the tiny window between
// activation and unregister, navigation requests bypass any stale cached
// response and go straight to the network. Without it the old cached shell
// (which lacks the current CSS link) can still be served for one paint.

function isOwnCache(name) {
  return /^ebl-v\d+$/.test(name) || /(^|-)precache-v\d+-|(^|-)runtime-/.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.map((n) => caches.delete(n)));
        await self.clients.claim();
        const wins = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          wins.map((c) => (typeof c.navigate === "function" ? c.navigate(c.url) : undefined)),
        );
      } finally {
        try {
          await self.registration.unregister();
        } catch {
          /* ignore */
        }
      }
    })(),
  ),
);

// Network-only pass-through. Never serve from cache. Never intercept — just
// let the browser do the fetch. This is critical while the worker is briefly
// active before unregister completes.
self.addEventListener("fetch", (event) => {
  // Do not call respondWith; the browser handles the request normally.
  // Explicitly no-op to make intent obvious.
  void event;
});
