import { BUILD_ID } from "./build-id";

// Versioned localStorage: keys are namespaced with the current build id.
// On first access after a deploy, stale namespaces are swept so cached UI
// state can never resurrect against an incompatible schema.
const NS_PREFIX = "ebl:v:";
const CURRENT_NS = `${NS_PREFIX}${BUILD_ID}:`;
let sweptOnce = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function sweep(): void {
  if (sweptOnce || !isBrowser()) return;
  sweptOnce = true;
  try {
    const remove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(NS_PREFIX) && !key.startsWith(CURRENT_NS)) {
        remove.push(key);
      }
    }
    remove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* quota / private mode — ignore */
  }
}

export const versionedStorage = {
  get<T = unknown>(key: string, fallback: T | null = null): T | null {
    if (!isBrowser()) return fallback;
    sweep();
    try {
      const raw = localStorage.getItem(CURRENT_NS + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    if (!isBrowser()) return;
    sweep();
    try {
      localStorage.setItem(CURRENT_NS + key, JSON.stringify(value));
    } catch {
      /* quota — ignore */
    }
  },
  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      localStorage.removeItem(CURRENT_NS + key);
    } catch {
      /* ignore */
    }
  },
};
