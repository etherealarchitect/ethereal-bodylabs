import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export type Tier = "free" | "premium";

export type SubscriptionRow = {
  id: string;
  status: string;
  price_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  created_at: string;
};

export function useSubscription() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const env = isPaymentsConfigured() ? getStripeEnvironment() : "sandbox";

  const query = useQuery({
    queryKey: ["subscription", user?.id, env],
    enabled: !!user,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as SubscriptionRow) ?? null;
    },
  });

  // Realtime: refetch when the user's subscription row changes.
  useEffect(() => {
    if (!user) return;
    const channelName = `sub-${user.id}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
      () => qc.invalidateQueries({ queryKey: ["subscription", user.id, env] }),
    );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, env, qc]);


  const sub = query.data ?? null;
  const now = Date.now();
  const periodOk = !sub?.current_period_end || new Date(sub.current_period_end).getTime() > now;
  const isTrialing = sub?.status === "trialing" && periodOk;
  const isActive =
    !!sub && periodOk && (
      sub.status === "trialing" ||
      sub.status === "active" ||
      sub.status === "past_due" ||
      (sub.status === "canceled" && !!sub.current_period_end && new Date(sub.current_period_end).getTime() > now)
    );

  const tier: Tier = isActive ? "premium" : "free";
  const trialDaysLeft = sub?.trial_end
    ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    subscription: sub,
    tier,
    isActive,
    isTrialing,
    trialDaysLeft,
    loading: query.isLoading,
    refetch: query.refetch,
  };
}
