import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { BUILD_ID } from "@/lib/build-id";

const POLL_MS = 5 * 60 * 1000; // 5 minutes
const NOTIFY_KEY = "ebl:update-toast-shown";

async function clearAllCaches(): Promise<void> {
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}

async function hardReload(): Promise<void> {
  await clearAllCaches();
  // Cache-busting param defeats intermediate proxies.
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

/**
 * CacheManager
 * - Polls /api/public/build/json to detect deploys.
 * - When a new build is live, shows a persistent toast prompting refresh.
 * - Refresh clears Cache Storage + service workers before reloading.
 */
export function CacheManager() {
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      if (cancelled || notifiedRef.current) return;
      try {
        const res = await fetch("/api/public/build/json", {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { id?: string };
        if (data?.id && data.id !== BUILD_ID) {
          notifiedRef.current = true;
          try {
            sessionStorage.setItem(NOTIFY_KEY, data.id);
          } catch {
            /* ignore */
          }
          toast.message("Update available", {
            description: "A new version of Ethereal Bodylabs is ready.",
            duration: Infinity,
            action: {
              label: "Refresh",
              onClick: () => {
                void hardReload();
              },
            },
          });
        }
      } catch {
        /* offline / transient — try again later */
      } finally {
        if (!cancelled && !notifiedRef.current) {
          timer = setTimeout(check, POLL_MS);
        }
      }
    };

    // Initial delay so we don't race with first paint.
    timer = setTimeout(check, 30_000);

    const onFocus = () => {
      void check();
    };
    const onOnline = () => {
      void check();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
