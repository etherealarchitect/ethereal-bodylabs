import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ebl.installPromptDismissedAt";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function dismissedRecently() {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setReady(true);
    if (isStandalone() || dismissedRecently()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS Safari has no beforeinstallprompt — surface manual instructions.
    if (isIos()) setVisible(true);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!ready || !visible) return null;

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
    setShowIosHelp(false);
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
      } else {
        dismiss();
      }
      setDeferred(null);
      return;
    }
    if (isIos()) setShowIosHelp(true);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-primary/30 bg-surface-1/95 p-3 shadow-lg backdrop-blur-md">
        {!showIosHelp ? (
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Add ETHEREAL to your home screen</div>
              <div className="text-xs text-muted-foreground">
                Launch instantly with Face ID / biometrics. No app store.
              </div>
            </div>
            <button
              onClick={install}
              className="h-9 shrink-0 rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span className="inline-flex items-center gap-1.5"><Download className="size-3.5" /> Install</span>
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="text-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="font-medium">Add to Home Screen</div>
              <button
                onClick={dismiss}
                aria-label="Close instructions"
                className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. Tap <Share className="mx-0.5 inline size-3.5 text-primary" /> <b className="text-foreground">Share</b> in Safari's toolbar</li>
              <li>2. Scroll and tap <b className="text-foreground">Add to Home Screen</b></li>
              <li>3. Tap <b className="text-foreground">Add</b> to confirm</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
