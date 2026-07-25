import { isNative } from "@/lib/platform";

/**
 * One-shot bootstrap of native-only integrations. Called from the root
 * component inside useEffect so it never runs during SSR. Every native
 * module is dynamically imported and swallowed on failure so a missing
 * plugin can never break the web bundle.
 */
export async function initNative(router: { navigate: (opts: { to: string }) => void }): Promise<void> {
  if (!isNative()) return;

  // Splash + status bar
  try {
    const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import("@capacitor/splash-screen"),
      import("@capacitor/status-bar"),
    ]);
    await StatusBar.setStyle({ style: Style.Light });
    await SplashScreen.hide();
  } catch {
    /* plugin unavailable in dev/web preview */
  }

  // Universal-link → in-app router bridge
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", (event) => {
      try {
        const url = new URL(event.url);
        const path = `${url.pathname}${url.search}${url.hash}`;
        if (path && path.startsWith("/")) router.navigate({ to: path });
      } catch {
        /* ignore malformed URLs */
      }
    });
  } catch {
    /* ignore */
  }

  // Register for push notifications (permission is requested lazily on opt-in
  // screen; this only initializes the listener graph).
  try {
    const { registerPushListeners } = await import("./push");
    await registerPushListeners();
  } catch {
    /* ignore */
  }

  // Bridge StoreKit Transaction.updates to server verification.
  try {
    const { startStoreKitListener } = await import("./storekit");
    await startStoreKitListener();
  } catch {
    /* ignore */
  }
}
