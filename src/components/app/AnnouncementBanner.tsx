import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X, Megaphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Row = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  level: string;
};

export function AnnouncementBanner() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["active-announcements", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Row | null> => {
      const nowIso = new Date().toISOString();
      const { data: rows, error } = await supabase
        .from("announcements")
        .select("id, title, body, cta_label, cta_href, level, starts_at, expires_at, active")
        .eq("active", true)
        .lte("starts_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error || !rows) return null;
      const active = rows.filter(
        (r: any) => !r.expires_at || new Date(r.expires_at).getTime() > Date.now(),
      );
      if (!active.length) return null;
      const { data: dismissed } = await supabase
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user!.id);
      const dismissedIds = new Set((dismissed ?? []).map((d: any) => d.announcement_id));
      const next = active.find((r: any) => !dismissedIds.has(r.id));
      return next ? (next as Row) : null;
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase
        .from("announcement_dismissals")
        .insert({ user_id: user.id, announcement_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-announcements"] }),
  });

  if (!data) return null;

  const Icon =
    data.level === "success" ? CheckCircle2 :
    data.level === "warning" ? AlertTriangle : Megaphone;
  const tone =
    data.level === "success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
    data.level === "warning" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
    "bg-primary/10 text-primary border-primary/30";

  return (
    <div className={`mx-3 mt-3 rounded-2xl border ${tone} p-3 flex items-start gap-3`}>
      <Icon className="size-4 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{data.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{data.body}</div>
        {data.cta_label && data.cta_href && (
          <Link
            to={data.cta_href as any}
            className="mt-2 inline-flex items-center text-xs font-medium underline underline-offset-2"
          >
            {data.cta_label} →
          </Link>
        )}
      </div>
      <button
        onClick={() => dismiss.mutate(data.id)}
        className="p-1 rounded-md hover:bg-black/5 text-muted-foreground shrink-0"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
