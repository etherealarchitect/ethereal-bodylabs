import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, PageHeader } from "@/components/app/AppShell";
import { HormnCta } from "@/components/app/HormnCta";
import { exportProfile, downloadEbp, importProfile } from "@/lib/ebp";
import { Download, Upload, LogOut, Settings as SettingsIcon, FileText, Images, Camera, Sparkles, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { PasskeysCard } from "@/components/app/PasskeysCard";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  units: string | null;
  sex: string | null;
  birth_year: number | null;
  height_cm: number | null;
  starting_weight_kg: number | null;
  target_weight_kg: number | null;
  goal: string | null;
  activity_level: string | null;
  training_days_per_week: number | null;
  kcal_target: number | null;
  protein_target_g: number | null;
  onboarding_complete: boolean | null;
};

function ProfilePage() {
  const { user } = useAuth();
  const { tier, isTrialing, trialDaysLeft, isActive } = useSubscription();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | "avatar" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setHandle(profile.handle ?? "");
      setUnits((profile.units as "metric" | "imperial") ?? "metric");
    }
  }, [profile]);

  // Resolve avatar to a signed URL when it's a storage path (userId/…),
  // or use as-is when it's a full URL (OAuth avatars).
  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const url = profile?.avatar_url;
      if (!url) { setAvatarSignedUrl(null); return; }
      if (/^https?:\/\//i.test(url)) { setAvatarSignedUrl(url); return; }
      const { data } = await supabase.storage.from("avatars").createSignedUrl(url, 60 * 60);
      if (!cancelled) setAvatarSignedUrl(data?.signedUrl ?? null);
    }
    void resolve();
    return () => { cancelled = true; };
  }, [profile?.avatar_url]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name || null, handle: handle || null, units })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setBusy("avatar");
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("profiles")
        .update({ avatar_url: path }).eq("id", user.id);
      if (dbErr) throw dbErr;
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Avatar upload failed");
    } finally {
      setBusy(null);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  }

  async function onExport() {
    setBusy("export"); setMsg(null);
    try {
      const p = await exportProfile();
      downloadEbp(p);
      setMsg("Exported .ebp file.");
    } catch (e: any) {
      setMsg(e?.message ?? "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setBusy("import"); setMsg(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const { imported } = await importProfile(payload, user.id);
      setMsg(`Imported ${imported} rows.`);
      qc.invalidateQueries();
    } catch (err: any) {
      setMsg(err?.message ?? "Import failed.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const planLabel =
    tier === "premium"
      ? isTrialing
        ? `Premium · trial (${trialDaysLeft ?? 0}d left)`
        : "Premium"
      : "Free";

  return (
    <div>
      <PageHeader eyebrow="You" title="Profile" />

      {/* Identity card */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-20 rounded-full overflow-hidden bg-surface-2 border border-border/60 grid place-items-center">
              {avatarSignedUrl ? (
                <img src={avatarSignedUrl} alt="Avatar" className="size-full object-cover" />
              ) : (
                <UserIcon className="size-8 text-muted-foreground" />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              disabled={busy === "avatar"}
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary text-primary-foreground grid place-items-center shadow disabled:opacity-50"
              aria-label="Change avatar"
            >
              <Camera className="size-3.5" />
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg font-semibold">
              {name || "Athlete"}
            </div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5">
              <Sparkles className="size-3" /> {planLabel}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="space-y-3">
          <Field label="Display name" value={name} onChange={setName} />
          <Field label="Handle" value={handle} onChange={setHandle} placeholder="e.g. scott" />
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Units
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["metric", "imperial"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnits(u)}
                  className={`h-10 rounded-lg border text-sm capitalize transition-colors ${
                    units === u
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-surface-2 text-foreground hover:border-border"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-2 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </Card>

      {/* Body & goal summary */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              Body & goal
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              From your onboarding — used for macro targets and coaching context.
            </div>
          </div>
          <Link
            to="/app/onboarding"
            className="text-xs text-primary hover:underline whitespace-nowrap"
          >
            Edit
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat label="Sex" value={profile?.sex ?? "—"} />
          <Stat label="Age" value={age !== null ? `${age}` : "—"} />
          <Stat label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "—"} />
          <Stat label="Start weight" value={profile?.starting_weight_kg ? `${profile.starting_weight_kg} kg` : "—"} />
          <Stat label="Target" value={profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "—"} />
          <Stat label="Goal" value={profile?.goal ?? "—"} />
          <Stat label="Activity" value={profile?.activity_level ?? "—"} />
          <Stat label="Training / wk" value={profile?.training_days_per_week ? `${profile.training_days_per_week}` : "—"} />
          <Stat label="kcal target" value={profile?.kcal_target ? `${profile.kcal_target}` : "—"} />
          <Stat label="Protein g" value={profile?.protein_target_g ? `${profile.protein_target_g}` : "—"} />
        </div>
      </Card>

      <HormnCta />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link to="/app/settings" className="rounded-2xl glass p-3 text-center hover:border-primary">
          <SettingsIcon className="size-4 mx-auto text-primary" />
          <div className="mt-1 text-xs font-medium">Settings</div>
        </Link>
        <Link to="/app/reports" className="rounded-2xl glass p-3 text-center hover:border-primary">
          <FileText className="size-4 mx-auto text-primary" />
          <div className="mt-1 text-xs font-medium">Report</div>
        </Link>
        <Link to="/app/photos/compare" className="rounded-2xl glass p-3 text-center hover:border-primary">
          <Images className="size-4 mx-auto text-primary" />
          <div className="mt-1 text-xs font-medium">Compare</div>
        </Link>
      </div>

      {!isActive && (
        <Link
          to="/app/upgrade"
          className="mt-4 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/5 p-4"
        >
          <div>
            <div className="text-sm font-semibold">Unlock Premium</div>
            <div className="text-xs text-muted-foreground">AI coach, bloodwork insights, PDF reports.</div>
          </div>
          <span className="text-xs text-primary font-medium">Upgrade →</span>
        </Link>
      )}
      {isActive && (
        <Link
          to="/app/billing"
          className="mt-4 flex items-center justify-between rounded-2xl glass p-4"
        >
          <div>
            <div className="text-sm font-semibold">Billing & subscription</div>
            <div className="text-xs text-muted-foreground">Plan, invoices, payment method.</div>
          </div>
          <span className="text-xs text-primary font-medium">Manage →</span>
        </Link>
      )}

      <Card className="mt-4">
        <div className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
            Portable profile (.ebp)
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Own your data. Export a full snapshot; import into any Ethereal instance.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExport}
            disabled={busy !== null}
            className="h-10 rounded-lg border border-border/60 bg-surface-2 text-sm font-medium hover:border-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Download className="size-4" /> {busy === "export" ? "…" : "Export"}
          </button>
          <label className="h-10 rounded-lg border border-border/60 bg-surface-2 text-sm font-medium hover:border-primary cursor-pointer inline-flex items-center justify-center gap-2">
            <Upload className="size-4" /> {busy === "import" ? "…" : "Import"}
            <input
              ref={fileRef}
              type="file"
              accept=".json,.ebp,application/json"
              onChange={onImport}
              className="hidden"
            />
          </label>
        </div>
        {msg && <div className="mt-2 text-xs text-muted-foreground">{msg}</div>}
      </Card>

      <PasskeysCard />

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/";
        }}
        className="mt-4 w-full h-10 rounded-lg border border-destructive/40 text-sm text-destructive hover:bg-destructive/10 inline-flex items-center justify-center gap-2"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2 p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium truncate">{value}</div>
    </div>
  );
}
