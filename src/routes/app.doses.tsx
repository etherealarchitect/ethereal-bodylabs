import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, PageHeader, EmptyState } from "@/components/app/AppShell";
import { Plus, Trash2, Check, X, AlertTriangle, Syringe, Pill, Clock, CalendarDays, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/app/doses")({
  head: () => ({
    meta: [
      { title: "Doses — ETHEREAL BODYLABS" },
      { name: "description", content: "Track compound schedules, doses, and administration history." },
    ],
  }),
  component: DosesPage,
});

const METHODS = ["IM", "SubQ", "Oral", "Sublingual", "Topical", "Nasal", "Inhaled", "IV"] as const;
const FREQ_TYPES = [
  { value: "interval", label: "Every N days" },
  { value: "weekly", label: "Specific weekdays" },
  { value: "as_needed", label: "As needed" },
] as const;
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Compound = { id: string; user_id: string | null; name: string; category: string | null; default_unit: string | null; default_method: string | null; notes: string | null };
type Schedule = { id: string; compound_id: string | null; compound_name: string; dose_amount: number; dose_unit: string; method: string; injection_site: string | null; frequency_type: string; interval_days: number | null; weekdays: number[] | null; time_of_day: string | null; start_date: string; end_date: string | null; active: boolean; notes: string | null };
type Log = { id: string; schedule_id: string | null; compound_name: string; dose_amount: number; dose_unit: string; method: string; injection_site: string | null; scheduled_at: string | null; taken_at: string | null; status: string; notes: string | null };

function DosesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const { data: schedules } = useQuery({
    queryKey: ["dose-schedules", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("dose_schedules").select("*").order("active", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Schedule[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["dose-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("dose_logs").select("*").order("taken_at", { ascending: false, nullsFirst: false }).limit(60);
      if (error) throw error;
      return data as Log[];
    },
  });

  const upcoming = useMemo(() => computeUpcoming(schedules ?? [], logs ?? []), [schedules, logs]);

  const logNow = useMutation({
    mutationFn: async (s: Schedule) => {
      if (!user) return;
      const { error } = await supabase.from("dose_logs").insert({
        user_id: user.id, schedule_id: s.id, compound_name: s.compound_name,
        dose_amount: s.dose_amount, dose_unit: s.dose_unit, method: s.method,
        injection_site: s.injection_site, taken_at: new Date().toISOString(), status: "taken",
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dose-logs"] }); qc.invalidateQueries({ queryKey: ["today"] }); },
  });

  const skip = useMutation({
    mutationFn: async ({ s, when }: { s: Schedule; when: Date }) => {
      if (!user) return;
      const { error } = await supabase.from("dose_logs").insert({
        user_id: user.id, schedule_id: s.id, compound_name: s.compound_name,
        dose_amount: s.dose_amount, dose_unit: s.dose_unit, method: s.method,
        scheduled_at: when.toISOString(), status: "skipped",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dose-logs"] }),
  });

  const toggleActive = useMutation({
    mutationFn: async (s: Schedule) => {
      const { error } = await supabase.from("dose_schedules").update({ active: !s.active }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dose-schedules"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("dose_schedules").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dose-schedules"] }),
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => { await supabase.from("dose_logs").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dose-logs"] }),
  });

  return (
    <div>
      <div className="mb-2">
        <Link to="/app/protocol" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-3" /> Protocol
        </Link>
      </div>
      <PageHeader
        eyebrow="Doses"
        title="Compound schedule"
        action={
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="h-9 rounded-full bg-primary text-primary-foreground px-3 text-xs font-medium inline-flex items-center gap-1">
            <Plus className="size-3.5" /> New
          </button>
        }
      />

      <Disclaimer />

      {/* Upcoming */}
      <section className="mb-6">
        <SectionTitle icon={<Clock className="size-3.5" />}>Upcoming</SectionTitle>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming doses." hint="Create a schedule to see the next planned dose." />
        ) : (
          <div className="space-y-1.5">
            {upcoming.slice(0, 6).map((u) => (
              <Card key={u.schedule.id + u.when.toISOString()} className="!p-3">
                <div className="flex items-center gap-3">
                  <MethodBadge method={u.schedule.method} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.schedule.compound_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {u.schedule.dose_amount} {u.schedule.dose_unit} · {formatWhen(u.when)}
                    </div>
                  </div>
                  <button
                    onClick={() => logNow.mutate(u.schedule)}
                    disabled={logNow.isPending}
                    className="h-8 rounded-full bg-primary text-primary-foreground px-3 text-[11px] font-medium inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="size-3" /> Log
                  </button>
                  <button
                    onClick={() => skip.mutate({ s: u.schedule, when: u.when })}
                    className="h-8 rounded-full border border-border/60 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    aria-label="Skip"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Schedules */}
      <section className="mb-6">
        <SectionTitle icon={<CalendarDays className="size-3.5" />}>Schedules</SectionTitle>
        {!schedules?.length ? (
          <EmptyState title="No schedules yet." hint="Add your first compound schedule above." />
        ) : (
          <div className="space-y-1.5">
            {schedules.map((s) => (
              <div key={s.id} className={`rounded-2xl border p-3 ${s.active ? "border-border/60 bg-surface-1/70" : "border-border/40 bg-surface-2/40 opacity-70"}`}>
                <div className="flex items-start gap-3">
                  <MethodBadge method={s.method} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.compound_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.dose_amount} {s.dose_unit} · {describeFreq(s)}
                      {s.time_of_day ? ` · ${s.time_of_day.slice(0, 5)}` : ""}
                      {s.injection_site ? ` · ${s.injection_site}` : ""}
                    </div>
                    {s.notes && <div className="mt-1 text-[11px] text-muted-foreground/80 line-clamp-2">{s.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive.mutate(s)}
                      className="h-7 rounded-full border border-border/60 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      {s.active ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => { setEditing(s); setShowForm(true); }}
                      className="h-7 rounded-full border border-border/60 px-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      Edit
                    </button>
                    <button onClick={() => { if (confirm("Delete this schedule?")) del.mutate(s.id); }}
                      className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section className="mb-6">
        <SectionTitle icon={<Syringe className="size-3.5" />}>History</SectionTitle>
        {!logs?.length ? (
          <EmptyState title="No dose history yet." />
        ) : (
          <div className="space-y-1">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-1/60 px-3 py-2">
                <StatusDot status={l.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {l.compound_name} <span className="text-muted-foreground">· {l.dose_amount} {l.dose_unit} · {l.method}</span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {formatWhen(new Date(l.taken_at ?? l.scheduled_at ?? l.status))} · {l.status}
                    {l.injection_site ? ` · ${l.injection_site}` : ""}
                  </div>
                </div>
                <button onClick={() => deleteLog.mutate(l.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete log">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <ScheduleForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["dose-schedules"] });
            qc.invalidateQueries({ queryKey: ["dose-compounds"] });
            setShowForm(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- form ---------------- */

function ScheduleForm({ initial, onClose, onSaved }: { initial: Schedule | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.compound_name ?? "");
  const [compoundId, setCompoundId] = useState<string | null>(initial?.compound_id ?? null);
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>(initial ? String(initial.dose_amount) : "");
  const [unit, setUnit] = useState(initial?.dose_unit ?? "mg");
  const [method, setMethod] = useState(initial?.method ?? "SubQ");
  const [site, setSite] = useState(initial?.injection_site ?? "");
  const [freqType, setFreqType] = useState(initial?.frequency_type ?? "interval");
  const [intervalDays, setIntervalDays] = useState<string>(initial?.interval_days ? String(initial.interval_days) : "7");
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [timeOfDay, setTimeOfDay] = useState(initial?.time_of_day?.slice(0, 5) ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [suggestions, setSuggestions] = useState<Compound[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load autocomplete suggestions when typing
  useEffect(() => {
    if (!name || name.length < 1) { setSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("dose_compounds")
        .select("id,user_id,name,category,default_unit,default_method,notes")
        .ilike("name", `%${name}%`)
        .limit(8);
      if (!cancelled) setSuggestions((data as Compound[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [name]);

  useEffect(() => {
    const on = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowSuggest(false); };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  const pick = (c: Compound) => {
    setName(c.name);
    setCompoundId(c.id);
    if (c.default_unit) setUnit(c.default_unit);
    if (c.default_method) setMethod(c.default_method);
    if (c.category) setCategory(c.category);
    setShowSuggest(false);
  };

  const submit = async () => {
    if (!user || !name || !amount) return;
    // Ensure a compound row exists (create user-owned if not chosen)
    let cid = compoundId;
    if (!cid) {
      const { data: existing } = await supabase.from("dose_compounds")
        .select("id").eq("name", name).or("user_id.is.null,user_id.eq." + user.id).maybeSingle();
      if (existing?.id) cid = existing.id;
      else {
        const { data: created, error: ce } = await supabase.from("dose_compounds").insert({
          user_id: user.id, name, category: category || null, default_unit: unit, default_method: method,
        }).select("id").single();
        if (ce) { alert(ce.message); return; }
        cid = created.id;
      }
    }

    const payload = {
      user_id: user.id,
      compound_id: cid,
      compound_name: name,
      dose_amount: Number(amount),
      dose_unit: unit,
      method,
      injection_site: site || null,
      frequency_type: freqType,
      interval_days: freqType === "interval" ? Number(intervalDays) || null : null,
      weekdays: freqType === "weekly" ? weekdays : null,
      time_of_day: timeOfDay || null,
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
    };

    if (isEdit && initial) {
      const { error } = await supabase.from("dose_schedules").update(payload).eq("id", initial.id);
      if (error) { alert(error.message); return; }
    } else {
      const { error } = await supabase.from("dose_schedules").insert(payload);
      if (error) { alert(error.message); return; }
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-sm p-3" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl glass-strong p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit schedule" : "New dose schedule"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X className="size-4" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Compound">
            <div ref={boxRef} className="relative">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setCompoundId(null); setShowSuggest(true); }}
                onFocus={() => setShowSuggest(true)}
                placeholder="e.g. Testosterone Cypionate"
                className={inputCls}
                autoComplete="off"
              />
              {showSuggest && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-border/60 bg-popover shadow-lg max-h-56 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button key={c.id} type="button" onClick={() => pick(c)}
                      className="w-full text-left px-3 py-2 hover:bg-secondary flex items-center justify-between">
                      <span className="text-sm">{c.name}</span>
                      {c.category && <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{c.category}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Dose">
              <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                {["mg", "mcg", "IU", "ml", "g", "units"].map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Method">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
          </div>

          {(method === "IM" || method === "SubQ" || method === "IV") && (
            <Field label="Injection site (optional)">
              <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. VG, delt, quad" className={inputCls} />
            </Field>
          )}

          <Field label="Frequency">
            <select value={freqType} onChange={(e) => setFreqType(e.target.value)} className={inputCls}>
              {FREQ_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>

          {freqType === "interval" && (
            <Field label="Every N days">
              <input type="number" min="1" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className={inputCls} />
            </Field>
          )}
          {freqType === "weekly" && (
            <Field label="Weekdays">
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((d, i) => {
                  const on = weekdays.includes(i);
                  return (
                    <button key={i} type="button"
                      onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i].sort())}
                      className={`h-9 rounded-lg text-xs font-medium border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Field label="Time of day">
              <input type="time" value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Start">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="End (optional)">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="e.g. rotate sites, taper plan, prescriber notes"
              className={`${inputCls} h-auto py-2 resize-none`} />
          </Field>

          <button onClick={submit} disabled={!name || !amount}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-50">
            {isEdit ? "Save changes" : "Create schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ui bits ---------------- */

const inputCls = "h-10 w-full rounded-lg border border-border/60 bg-surface-2 px-3 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider font-mono text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-primary">
      {icon}{children}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const injectable = ["IM", "SubQ", "IV"].includes(method);
  const Icon = injectable ? Syringe : Pill;
  return (
    <div className="size-9 shrink-0 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center">
      <Icon className="size-4" />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "taken" ? "bg-success" : status === "skipped" ? "bg-muted-foreground" : "bg-destructive";
  return <span className={`size-2 rounded-full ${color}`} />;
}

function Disclaimer() {
  return (
    <Card className="mb-5 border border-warning/40 bg-warning/5">
      <div className="flex gap-3">
        <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-foreground font-medium">Objective logging tool — not medical advice.</span>{" "}
          Ethereal Bodylabs does not endorse, recommend or support the use of any peptides, hormones, medications or
          controlled substances. Only track compounds that have been prescribed to you by your treating physician,
          and follow their dosing instructions.
        </div>
      </div>
    </Card>
  );
}

/* ---------------- schedule → upcoming projection ---------------- */

function computeUpcoming(schedules: Schedule[], logs: Log[]) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400_000);
  const items: { schedule: Schedule; when: Date }[] = [];
  for (const s of schedules) {
    if (!s.active || s.frequency_type === "as_needed") continue;
    const start = new Date(s.start_date + "T00:00:00");
    const end = s.end_date ? new Date(s.end_date + "T23:59:59") : horizon;
    const [h, m] = (s.time_of_day ?? "09:00").split(":").map(Number);

    // Find last taken log for this schedule
    const lastTaken = logs.find((l) => l.schedule_id === s.id && l.taken_at);
    const lastAt = lastTaken?.taken_at ? new Date(lastTaken.taken_at) : null;

    const cursor = new Date(Math.max(start.getTime(), now.getTime() - 86400_000));
    cursor.setHours(h || 9, m || 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const d = new Date(cursor.getTime() + i * 86400_000);
      if (d > end || d > horizon) break;
      let hit = false;
      if (s.frequency_type === "interval" && s.interval_days) {
        const daysFromStart = Math.floor((d.getTime() - start.getTime()) / 86400_000);
        hit = daysFromStart >= 0 && daysFromStart % s.interval_days === 0;
      } else if (s.frequency_type === "weekly" && s.weekdays?.length) {
        hit = s.weekdays.includes(d.getDay());
      }
      if (!hit) continue;
      if (lastAt && d.getTime() <= lastAt.getTime()) continue;
      items.push({ schedule: s, when: d });
      if (items.filter((x) => x.schedule.id === s.id).length >= 3) break;
    }
  }
  return items.sort((a, b) => a.when.getTime() - b.when.getTime());
}

function describeFreq(s: Schedule) {
  if (s.frequency_type === "interval" && s.interval_days) return s.interval_days === 1 ? "daily" : `every ${s.interval_days} days`;
  if (s.frequency_type === "weekly" && s.weekdays?.length) {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return s.weekdays.map((i) => names[i]).join(", ");
  }
  return "as needed";
}

function formatWhen(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400_000).toDateString() === d.toDateString();
  const t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${t}`;
  if (tomorrow) return `Tomorrow · ${t}`;
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " · " + t;
}
