import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

// Beta `supabase.auth.oauth` namespace — typed wrapper.
type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
type SbAuthOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthorizationDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<{ redirect_url?: string; redirect_to?: string }>>;
};
function oauthApi(): SbAuthOAuth {
  return (supabase.auth as unknown as { oauth: SbAuthOAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: Supabase reads session from localStorage.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Authorize access — ETHEREAL BODYLABS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } as any });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate } as any);
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center px-5">
      <GlassCard className="max-w-md p-8 text-center">
        <h1 className="text-lg font-medium">Could not load this authorization request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {String((error as Error)?.message ?? error)}
        </p>
      </GlassCard>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an external app";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-10 bg-gradient-to-b from-background to-surface-1">
      <GlassCard className="max-w-md w-full p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Authorize connection
            </p>
            <h1 className="text-lg font-medium">Connect {clientName} to your account</h1>
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          {clientName} will be able to call ETHEREAL BODYLABS tools while you are signed in.
          This does not bypass your permissions or data policies.
        </p>

        {scopes.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-medium">Requested access</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {scopes.map((s: string) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary/60" />
                  {s === "openid" || s === "profile" || s === "email"
                    ? `Basic ${s} information`
                    : s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => decide(true)}
            disabled={busy !== null}
            className="flex-1"
          >
            {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : "Approve"}
          </Button>
          <Button
            variant="outline"
            onClick={() => decide(false)}
            disabled={busy !== null}
            className="flex-1"
          >
            {busy === "deny" ? <Loader2 className="size-4 animate-spin" /> : "Cancel"}
          </Button>
        </div>
      </GlassCard>
    </main>
  );
}
