import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader } from "@/components/app/AppShell";
import { deleteMyAccount } from "@/lib/account.functions";
import { enableReminders, disableReminders, loadReminderConfig } from "@/lib/reminders";
import { ArrowLeft, Bell, BellOff, Trash2, Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const delFn = useServerFn(deleteMyAccount);

  const { data: settings } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      if (!data) {
        await supabase.from("user_settings").insert({ user_id: user!.id });
        const { data: fresh } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
        return fresh;
      }
      return data;
    },
  });

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [reminderTime, setReminderTime] = useState("07:30");
  const [remindersOn, setRemindersOn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (settings) {
      setTheme((settings.theme as any) ?? "system");
      setReminderTime(settings.reminder_time ?? "07:30");
    }
    const cfg = loadReminderConfig();
    setRemindersOn(cfg.enabled);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", dark);
    }
  }, [theme]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("user_settings").upsert({
        user_id: user.id, theme, reminder_time: reminderTime, reminders_enabled: remindersOn,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved."); },
  });

  async function toggleReminders(next: boolean) {
    if (next) {
      const ok = await enableReminders(reminderTime);
      if (!ok) { toast.error("Notification permission denied."); return; }
      setRemindersOn(true);
      toast.success(`Daily reminder set for ${reminderTime}.`);
    } else {
      disableReminders();
      setRemindersOn(false);
    }
  }

  async function onDelete() {
    try {
      await delFn();
      await supabase.auth.signOut();
      toast.success("Account deleted.");
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete account.");
    }
  }

  return (
    <div>
      <Link to="/app/profile" className="inline-flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <ArrowLeft className="size-3.5" /> Profile
      </Link>
      <PageHeader eyebrow="You" title="Settings" />

      <Card className="mb-4">
        <Link
          to="/app/billing"
          className="flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Billing</div>
            <div className="text-sm font-medium">Subscription & payments</div>
            <div className="text-xs text-muted-foreground">Plan, next billing date, card, invoices.</div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">Manage →</span>
        </Link>
      </Card>


      <Card className="mb-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Appearance</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["light", Sun], ["dark", Moon], ["system", Monitor],
          ] as const).map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              className={`h-11 rounded-lg border text-xs capitalize inline-flex items-center justify-center gap-1.5 ${
                theme === v ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-surface-2"
              }`}
            >
              <Icon className="size-3.5" /> {v}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Daily reminders</div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Log workouts, meals & rites</div>
            <div className="text-xs text-muted-foreground">Fires once a day at the time below.</div>
          </div>
          <button
            onClick={() => toggleReminders(!remindersOn)}
            className={`h-9 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
              remindersOn ? "bg-primary text-primary-foreground" : "border border-border/60 bg-surface-2"
            }`}
          >
            {remindersOn ? <><Bell className="size-3.5" /> On</> : <><BellOff className="size-3.5" /> Off</>}
          </button>
        </div>
        <div className="mt-3">
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </Card>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save settings"}
      </button>

      <Card className="mt-6 border-destructive/40">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-destructive">Danger zone</div>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full h-10 rounded-lg border border-destructive/40 text-destructive text-sm inline-flex items-center justify-center gap-2"
          >
            <Trash2 className="size-4" /> Delete my account
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              This permanently deletes your profile, workouts, meals, photos, and blood reports. This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="h-10 rounded-lg border border-border/60 bg-surface-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Permanently delete
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
