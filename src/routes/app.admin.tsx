import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminGate } from "@/components/AdminGate";
import { Card, PageHeader } from "@/components/app/AppShell";
import { toast } from "sonner";
import {
  Users, DollarSign, TrendingUp, Sparkles, Dumbbell, Apple, Camera, FlaskConical,
  Send, Trash2, Power, PowerOff, RefreshCw, Activity,
} from "lucide-react";
import {
  getAdminStats, listAllAnnouncements, createAnnouncement,
  setAnnouncementActive, deleteAnnouncement,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/app/admin")({
  component: () => (
    <AdminGate>
      <AdminPage />
    </AdminGate>
  ),
});

function AdminPage() {
  const stats = useServerFn(getAdminStats);
  const list = useServerFn(listAllAnnouncements);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => stats(),
  });
  const { data: announcements, refetch: refetchA } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => list(),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Control Center"
        action={
          <button
            onClick={() => { void refetch(); void refetchA(); }}
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-surface-2 h-9 px-3 text-xs hover:border-primary"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {isLoading || !data ? (
        <Card>Loading stats…</Card>
      ) : (
        <>
          {/* Revenue */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={DollarSign} label="MRR" value={data.revenue.mrr_display}
              sub={`${data.revenue.active_paid_count} paid · ${data.revenue.environment}`} accent />
            <StatCard icon={TrendingUp} label="ARR" value={data.revenue.arr_display}
              sub={`${data.revenue.trialing_count} trialing`} accent />
          </div>

          {/* Growth */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatCard icon={Users} label="Users" value={data.totals.users.toString()}
              sub={`+${data.newLast30d.users} · 30d`} />
            <StatCard icon={Sparkles} label="New subs" value={data.newLast30d.subscribers.toString()}
              sub="last 30d" />
            <StatCard icon={Dumbbell} label="Workouts" value={data.totals.workouts.toString()}
              sub={`+${data.newLast30d.workouts} · 30d`} />
          </div>

          {/* Subscription status */}
          <Card className="mt-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Subscription status
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat label="Active" value={data.totals.subscriptions_active} />
              <MiniStat label="Trialing" value={data.totals.subscriptions_trialing} />
              <MiniStat label="Past due" value={data.totals.subscriptions_past_due} />
              <MiniStat label="Canceled" value={data.totals.subscriptions_canceled} />
            </div>
          </Card>

          {/* Engagement */}
          <Card className="mt-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Engagement top lines
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniRow icon={Apple} label="Meals logged" value={data.totals.meals_logged} />
              <MiniRow icon={Dumbbell} label="Workouts" value={data.totals.workouts} />
              <MiniRow icon={Camera} label="Physique photos" value={data.totals.physique_photos} />
              <MiniRow icon={FlaskConical} label="Blood reports" value={data.totals.blood_reports} />
            </div>
          </Card>

          {/* Recent users */}
          <Card className="mt-4">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Recent sign-ups
            </div>
            <div className="divide-y divide-border/60">
              {data.recentUsers.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">No users yet.</div>
              )}
              {data.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 text-xs">
                  <span className="truncate">{u.email}</span>
                  <span className="text-muted-foreground shrink-0 ml-3">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="mt-4">
        <Link
          to="/app/admin/ai-usage"
          className="flex items-center justify-between rounded-lg p-2 hover:bg-surface-2"
        >
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <div>
              <div className="text-sm font-medium">AI Usage Events</div>
              <div className="text-xs text-muted-foreground">Filter & export model call logs</div>
            </div>
          </div>
          <span className="text-xs text-primary">Open →</span>
        </Link>
      </Card>


      {/* Push notifications */}
      <PushComposer onSent={() => refetchA()} />

      <Card className="mt-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          Announcements
        </div>
        {(!announcements || announcements.length === 0) && (
          <div className="text-xs text-muted-foreground">No announcements yet.</div>
        )}
        <div className="space-y-2">
          {announcements?.map((a) => (
            <AnnouncementRow key={a.id} a={a} onChange={() => refetchA()} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-primary/10 border border-primary/30" : "glass"}`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2 py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniRow({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function PushComposer({ onSent }: { onSent: () => void }) {
  const create = useServerFn(createAnnouncement);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [level, setLevel] = useState<"info" | "success" | "warning">("info");
  const [expiresDays, setExpiresDays] = useState("7");

  const send = useMutation({
    mutationFn: async () => {
      const days = parseInt(expiresDays, 10);
      const expires_at = Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      return create({
        data: {
          title, body,
          cta_label: ctaLabel || undefined,
          cta_href: ctaHref || undefined,
          level,
          expires_at,
        },
      });
    },
    onSuccess: () => {
      toast.success("Notification sent to all users");
      setTitle(""); setBody(""); setCtaLabel(""); setCtaHref("");
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      onSent();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  return (
    <Card className="mt-4">
      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          Push notification
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Broadcast an in-app announcement to every signed-in user.
        </div>
      </div>
      <div className="space-y-2">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
        />
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Message body"
          rows={3}
          className="w-full rounded-lg border border-border/60 bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-2">
          <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="CTA label (optional)"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary" />
          <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)}
            placeholder="CTA path e.g. /app/upgrade"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={level} onChange={(e) => setLevel(e.target.value as any)}
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
          </select>
          <input value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)}
            placeholder="Expires in (days)"
            inputMode="numeric"
            className="h-10 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary" />
        </div>
        <button
          onClick={() => send.mutate()}
          disabled={send.isPending || !title.trim() || !body.trim()}
          className="mt-1 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Send className="size-4" /> {send.isPending ? "Sending…" : "Send to all users"}
        </button>
      </div>
    </Card>
  );
}

function AnnouncementRow({ a, onChange }: { a: any; onChange: () => void }) {
  const toggleFn = useServerFn(setAnnouncementActive);
  const delFn = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: () => toggleFn({ data: { id: a.id, active: !a.active } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      onChange();
    },
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: a.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-announcements"] });
      onChange();
    },
  });

  return (
    <div className="rounded-xl border border-border/60 bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{a.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{a.body}</div>
          <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {a.level} · {a.active ? "active" : "inactive"} · {new Date(a.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => toggle.mutate()}
            className="p-1.5 rounded-md border border-border/60 hover:border-primary"
            aria-label="Toggle active"
          >
            {a.active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
          </button>
          <button
            onClick={() => { if (confirm("Delete announcement?")) del.mutate(); }}
            className="p-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
