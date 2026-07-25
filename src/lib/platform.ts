/**
 * Platform detection. SSR-safe: every call returns `false` on the server.
 * Do NOT import @capacitor/* at module scope of shared code — dynamic
 * import from useEffect/handlers only, so the web bundle stays clean.
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.() ?? "web";
  return p === "ios" || p === "android" ? p : "web";
}

export function isIOS(): boolean {
  return nativePlatform() === "ios";
}

export function isAndroid(): boolean {
  return nativePlatform() === "android";
}
