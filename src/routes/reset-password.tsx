import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — ETHEREAL BODYLABS" },
      { name: "description", content: "Choose a new password for your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places the recovery session in the URL hash. onAuthStateChange
    // fires with PASSWORD_RECOVERY when the SDK has consumed it.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check if a session is already available (page revisit).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    if (password.length < 8) { setErr("Use at least 8 characters."); return; }
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate({ to: "/app" });
    } catch (e: any) {
      setErr(e?.message ?? "Could not update password.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Ethereal Bodylabs</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password.</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">Waiting for reset link…</p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">New password</span>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={8}
                className="h-11 w-full rounded-xl border border-border/60 bg-surface-2 px-3.5 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Confirm</span>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8}
                className="h-11 w-full rounded-xl border border-border/60 bg-surface-2 px-3.5 text-sm outline-none focus:border-primary" />
            </label>
            {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
            <button disabled={busy} type="submit"
              className="mt-2 h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {busy ? "…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
