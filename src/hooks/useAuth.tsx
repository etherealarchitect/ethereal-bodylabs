import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Track which user IDs we've already ensured a profile row for in this tab.
const ensured = new Set<string>();

async function ensureProfile(user: User) {
  if (ensured.has(user.id)) return;
  ensured.add(user.id);
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (meta.display_name as string) ||
      (meta.full_name as string) ||
      (meta.name as string) ||
      (user.email ? user.email.split("@")[0] : "Athlete");
    const avatarUrl =
      (meta.avatar_url as string) || (meta.picture as string) || null;

    // Owner-scoped RLS: id = auth.uid(). Upsert is idempotent — safe on every
    // sign-in and self-heals users whose auth row predates the profiles table.
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );
    if (error && !/duplicate key/i.test(error.message)) {
      // Non-fatal — the app can still render; log for diagnostics only.
      console.warn("[useAuth] ensureProfile failed:", error.message);
      ensured.delete(user.id);
    }
  } catch (e) {
    ensured.delete(user.id);
    console.warn("[useAuth] ensureProfile threw:", e);
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) void ensureProfile(s.user);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session?.user) void ensureProfile(data.session.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}
