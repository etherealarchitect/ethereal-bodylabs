import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

const ADMIN_EMAIL = "scottkbrown1337@gmail.com";

function assertAdmin(claims: any): void {
  const email = String(claims?.email ?? "").toLowerCase().trim();
  if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
}

export type AdminStats = {
  totals: {
    users: number;
    subscriptions_active: number;
    subscriptions_trialing: number;
    subscriptions_canceled: number;
    subscriptions_past_due: number;
    workouts: number;
    meals_logged: number;
    physique_photos: number;
    blood_reports: number;
  };
  newLast30d: {
    users: number;
    subscribers: number;
    workouts: number;
  };
  revenue: {
    currency: string;
    mrr_cents: number;
    arr_cents: number;
    mrr_display: string;
    arr_display: string;
    active_paid_count: number;
    trialing_count: number;
    environment: StripeEnv;
  };
  recentUsers: { id: string; email: string; created_at: string }[];
};

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    assertAdmin(context.claims);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // parallel counts
    const [
      profilesCount,
      workoutsCount,
      mealsCount,
      photosCount,
      bloodCount,
      subsAll,
      newWorkouts,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("workouts").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("meals").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("physique_photos").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("blood_reports").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("subscriptions")
        .select("id, user_id, status, price_id, current_period_end, environment, created_at"),
      supabaseAdmin
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    const subs = (subsAll.data ?? []) as Array<{
      status: string;
      price_id: string | null;
      environment: string;
      created_at: string;
      current_period_end: string | null;
      user_id: string;
    }>;

    const now = Date.now();
    const isCurrent = (row: (typeof subs)[number]) =>
      !row.current_period_end || new Date(row.current_period_end).getTime() > now;

    const active = subs.filter((s) => s.status === "active" && isCurrent(s));
    const trialing = subs.filter((s) => s.status === "trialing" && isCurrent(s));
    const canceled = subs.filter((s) => s.status === "canceled");
    const pastDue = subs.filter((s) => s.status === "past_due");
    const newSubs30d = subs.filter((s) => new Date(s.created_at).getTime() >= Date.parse(since));

    // MRR from live active paid subs via Stripe price lookup (fallback: monthly $12.99).
    const env: StripeEnv = subs.some((s) => s.environment === "live" && s.status === "active")
      ? "live"
      : "sandbox";

    let mrrCents = 0;
    let currency = "usd";
    try {
      const stripe = createStripeClient(env);
      const uniquePriceIds = Array.from(
        new Set(
          active
            .map((s) => s.price_id)
            .filter((p): p is string => !!p && p.startsWith("price_")),
        ),
      );
      const priceMap = new Map<string, { unit: number; interval: string; interval_count: number; currency: string }>();
      await Promise.all(
        uniquePriceIds.map(async (id) => {
          try {
            const p = await stripe.prices.retrieve(id);
            priceMap.set(id, {
              unit: p.unit_amount ?? 0,
              interval: p.recurring?.interval ?? "month",
              interval_count: p.recurring?.interval_count ?? 1,
              currency: p.currency ?? "usd",
            });
          } catch {
            /* ignore missing price */
          }
        }),
      );
      for (const s of active) {
        const p = s.price_id ? priceMap.get(s.price_id) : undefined;
        if (!p) {
          mrrCents += 1299; // fallback: $12.99 monthly
          continue;
        }
        currency = p.currency || currency;
        let monthly = p.unit;
        if (p.interval === "year") monthly = p.unit / 12;
        else if (p.interval === "week") monthly = p.unit * (52 / 12);
        else if (p.interval === "day") monthly = p.unit * (365 / 12);
        if (p.interval_count && p.interval_count > 1) monthly = monthly / p.interval_count;
        mrrCents += Math.round(monthly);
      }
    } catch (err) {
      // Fallback estimate if Stripe unreachable
      mrrCents = active.length * 1299;
      console.warn("MRR Stripe lookup failed:", getStripeErrorMessage(err));
    }

    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() });
    const arrCents = mrrCents * 12;

    // recent users
    const { data: recentUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 8 });
    const recentUsers = (recentUsersData?.users ?? []).slice(0, 8).map((u) => ({
      id: u.id,
      email: u.email ?? "—",
      created_at: u.created_at,
    }));

    const newUsers30d = (recentUsersData?.users ?? []).filter(
      (u) => Date.parse(u.created_at) >= Date.parse(since),
    ).length;

    return {
      totals: {
        users: profilesCount.count ?? 0,
        subscriptions_active: active.length,
        subscriptions_trialing: trialing.length,
        subscriptions_canceled: canceled.length,
        subscriptions_past_due: pastDue.length,
        workouts: workoutsCount.count ?? 0,
        meals_logged: mealsCount.count ?? 0,
        physique_photos: photosCount.count ?? 0,
        blood_reports: bloodCount.count ?? 0,
      },
      newLast30d: {
        users: newUsers30d,
        subscribers: newSubs30d.length,
        workouts: newWorkouts.count ?? 0,
      },
      revenue: {
        currency,
        mrr_cents: mrrCents,
        arr_cents: arrCents,
        mrr_display: fmt.format(mrrCents / 100),
        arr_display: fmt.format(arrCents / 100),
        active_paid_count: active.length,
        trialing_count: trialing.length,
        environment: env,
      },
      recentUsers,
    };
  });

/* ---------------- announcements ---------------- */

export type Announcement = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  level: string;
  active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
};

export const listAllAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    assertAdmin(context.claims);
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Announcement[];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string;
    body: string;
    cta_label?: string;
    cta_href?: string;
    level?: "info" | "success" | "warning";
    expires_at?: string | null;
  }) => d)
  .handler(async ({ data, context }): Promise<Announcement> => {
    assertAdmin(context.claims);
    if (!data.title.trim() || !data.body.trim()) throw new Error("Title and body are required");
    const insert = {
      title: data.title.trim(),
      body: data.body.trim(),
      cta_label: data.cta_label?.trim() || null,
      cta_href: data.cta_href?.trim() || null,
      level: data.level ?? "info",
      expires_at: data.expires_at ?? null,
      created_by: context.userId,
    };
    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Announcement;
  });

export const setAnnouncementActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    assertAdmin(context.claims);
    const { error } = await context.supabase
      .from("announcements")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    assertAdmin(context.claims);
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
