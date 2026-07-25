import { useEffect, useState } from "react";
import { Card } from "@/components/app/AppShell";
import { KeyRound, Trash2, Plus, Loader2, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { passkeysSupported, platformAuthenticatorSupported, registerPasskey } from "@/lib/passkeys";
import { listPasskeys, deletePasskey } from "@/lib/passkeys.functions";

type Row = { id: string; device_name: string | null; created_at: string; last_used_at: string | null; transports: string[] };

function guess() {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "This device";
}

export function PasskeysCard() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await listPasskeys({ data: undefined as any });
      setRows(res.passkeys as Row[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load passkeys");
    }
  }

  useEffect(() => {
    setSupported(passkeysSupported());
    platformAuthenticatorSupported().then(setPlatform);
    refresh();
  }, []);

  async function add() {
    if (busy) return;
    setBusy(true);
    const res = await registerPasskey(guess());
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? "Couldn't add passkey");
      return;
    }
    toast.success("Passkey added — sign in with Face ID / Touch ID next time");
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remove this passkey? You can add another anytime.")) return;
    const res = await deletePasskey({ data: { id } });
    if (!res.ok) {
      toast.error(res.error ?? "Failed to remove");
      return;
    }
    toast.success("Passkey removed");
    refresh();
  }

  if (supported === false) {
    return (
      <Card className="mt-4">
        <div className="flex items-start gap-2.5">
          <KeyRound className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground">
            Passkeys aren't supported on this browser. Open the app in Safari (iOS 16+) or Chrome / Edge to enrol Face ID, Touch ID, or Windows Hello.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Passkeys</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Sign in with {platform ? "Face ID, Touch ID, or your device biometrics" : "your device's screen unlock or a security key"} — no password required.
          </div>
        </div>
        <Fingerprint className="size-5 text-primary shrink-0" />
      </div>

      <button
        onClick={add}
        disabled={busy}
        className="h-10 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add a passkey on this device
      </button>

      {rows && rows.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface-2 px-2.5 py-2">
              <KeyRound className="size-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.device_name ?? "Passkey"}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  Added {new Date(r.created_at).toLocaleDateString()}
                  {r.last_used_at ? ` · Used ${new Date(r.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove passkey"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length === 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          No passkeys yet. Tap the button above to enrol this device — you'll unlock the app with biometrics from the home-screen icon.
        </p>
      )}
    </Card>
  );
}
