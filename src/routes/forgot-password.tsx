import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ETHEREAL BODYLABS" },
      { name: "description", content: "Send a password reset link to your email." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),

  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setMsg("If an account exists, we've sent a reset link.");
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Link to="/auth" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Sparkles className="size-4 text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Ethereal Bodylabs</span>
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the email attached to your account. We'll send a link.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Email</span>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border/60 bg-surface-2 px-3.5 text-sm outline-none focus:border-primary"
            />
          </label>
          {err && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}
          {msg && <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">{msg}</div>}
          <button disabled={busy} type="submit"
            className="mt-2 h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {busy ? "…" : "Send reset link"}
          </button>
        </form>

        <Link to="/auth" className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
