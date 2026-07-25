/**
 * Client-side local reminders using the Notification API.
 * Schedules a daily reminder at HH:MM (user's local time). Persists last
 * fire timestamp in localStorage to avoid duplicates.
 */
const LAST_KEY = "ebl.reminder.lastFire";
const CFG_KEY = "ebl.reminder.cfg";
let timer: ReturnType<typeof setInterval> | null = null;

type Cfg = { enabled: boolean; time: string };

function today(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 7, m ?? 30, 0, 0);
  return d;
}

async function ensurePermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

function fire() {
  try {
    new Notification("ETHEREAL BODYLABS", {
      body: "Time to log today's session, meals and rites.",
      icon: "/favicon.ico",
      tag: "ebl-daily",
    });
    localStorage.setItem(LAST_KEY, new Date().toISOString().slice(0, 10));
  } catch {}
}

export function loadReminderConfig(): Cfg {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (raw) return JSON.parse(raw) as Cfg;
  } catch {}
  return { enabled: false, time: "07:30" };
}

export function saveReminderConfig(cfg: Cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  startReminders(cfg);
}

export function startReminders(cfg = loadReminderConfig()) {
  if (typeof window === "undefined") return;
  if (timer) clearInterval(timer);
  if (!cfg.enabled) return;
  timer = setInterval(() => {
    const now = new Date();
    const target = today(cfg.time);
    if (now.getTime() < target.getTime()) return;
    const last = localStorage.getItem(LAST_KEY);
    if (last === now.toISOString().slice(0, 10)) return;
    fire();
  }, 60 * 1000);
}

export async function enableReminders(time: string): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  saveReminderConfig({ enabled: true, time });
  return true;
}
export function disableReminders() {
  saveReminderConfig({ ...loadReminderConfig(), enabled: false });
}
