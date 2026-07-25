import { createFileRoute, Link, useNavigate, Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Check, Mail, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound } from "lucide-react";
import { issueTrustedDevice, checkTrustedDevice } from "@/lib/trusted-devices.functions";
import { savePlanIntent, readPlanIntent, clearPlanIntent, withPlan, parsePlanInput, type PlanIntent } from "@/lib/plan-intent";
import { passkeysSupported, signInWithPasskey, lastPasskeyEmail, clearLastPasskeyEmail } from "@/lib/passkeys";

const OTP_TTL_SECONDS = 600; // 10 minutes — matches Supabase default
const RESEND_COOLDOWN_SECONDS = 60;
const TRUSTED_DEVICE_KEY = "ebl.trustedDevices.v2"; // { [emailLower]: token }

type TrustedDeviceMap = Record<string, string>;

function readTrustedTokens(): TrustedDeviceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TRUSTED_DEVICE_KEY);
    return raw ? (JSON.parse(raw) as TrustedDeviceMap) : {};
  } catch {
    return {};
  }
}

function getTrustedToken(email: string): string | null {
  const map = readTrustedTokens();
  return map[email.trim().toLowerCase()] ?? null;
}

function saveTrustedToken(email: string, token: string) {
  if (typeof window === "undefined") return;
  const map = readTrustedTokens();
  map[email.trim().toLowerCase()] = token;
  try {
    window.localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(map));
  } catch {}
}

function clearTrustedToken(email: string) {
  if (typeof window === "undefined") return;
  const map = readTrustedTokens();
  delete map[email.trim().toLowerCase()];
  try {
    window.localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(map));
  } catch {}
}


const modeSchema = z.enum(["signin", "signup"]).optional().catch(undefined);

// Validate untrusted URL params. Distinguish "absent" from "present but
// invalid" so the UI can show an explicit fallback message when someone
// hand-types /auth?plan=deluxe or a stale link points at a removed plan.
function validateAuthSearch(search: Record<string, unknown>): {
  plan?: PlanIntent;
  planInvalid?: true;
  mode?: "signin" | "signup";
  next?: string;
} {
  const { plan, planInvalid } = parsePlanInput(search.plan);
  // `next` must be a same-origin relative path (starts with a single `/`,
  // not `//`). Anything else is dropped — never redirect to arbitrary URLs.
  const rawNext = typeof search.next === "string" ? search.next : undefined;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : undefined;
  return { plan, planInvalid, mode: modeSchema.parse(search.mode), next };
}

export const Route = createFileRoute("/auth")({
  validateSearch: validateAuthSearch,
  head: () => ({
    meta: [
      { title: "Sign in — ETHEREAL BODYLABS" },
      { name: "description", content: "Sign in or create your ETHEREAL BODYLABS account." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Sign in — ETHEREAL BODYLABS" },
      { property: "og:description", content: "Athlete-grade tracking. Own your data." },
    ],
  }),

  component: AuthPage,
});

// ---------- Validation ----------
const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(255);
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Max 72 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number");
const nameSchema = z.string().trim().min(1, "Required").max(80, "Max 80 characters");

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..5
}

// ---------- Component ----------
export function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { plan: planFromUrl, planInvalid, mode: initialMode, next } = Route.useSearch();
  // Resolve plan intent from URL first, falling back to persisted storage so
  // the intent survives OAuth round-trips, tab switches (email link), and
  // full page reloads during the verification wait.
  const [effectivePlan, setEffectivePlan] = useState<PlanIntent | null>(
    (planFromUrl as PlanIntent | undefined) ?? null,
  );
  useEffect(() => {
    if (planFromUrl) {
      savePlanIntent(planFromUrl);
      setEffectivePlan(planFromUrl);
    } else {
      const stored = readPlanIntent();
      if (stored) setEffectivePlan(stored);
    }
  }, [planFromUrl]);
  const plan = effectivePlan;
  const intendsPremium = plan === "premium_monthly" || plan === "premium_yearly";

  // Callback URL that carries plan intent through the email magic-link round trip.
  // Deferred to the client so SSR doesn't touch `window`.
  const [callbackUrl, setCallbackUrl] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const base = withPlan(window.location.origin + "/auth/callback", plan ?? null);
    // Carry `next` through the OAuth/email round trip so the callback can
    // return the user to the original destination (e.g. OAuth consent).
    const url = next ? `${base}${base.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}` : base;
    setCallbackUrl(url);
  }, [plan, next]);

  const [mode, setMode] = useState<"signin" | "signup">(
    initialMode ?? (intendsPremium ? "signup" : "signin"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "apple">(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; form?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; name?: boolean }>({});
  const [checkYourEmail, setCheckYourEmail] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);
  const [rememberedPasskeyEmail, setRememberedPasskeyEmail] = useState<string | null>(null);
  useEffect(() => {
    setCanPasskey(passkeysSupported());
    setRememberedPasskeyEmail(lastPasskeyEmail());
  }, []);

  // Set when a passkey attempt fails with something other than user-cancel,
  // so the UI can surface OAuth/email fallbacks and a re-register hint.
  const [passkeyFallback, setPasskeyFallback] = useState<
    null | { kind: "not_found" | "error"; email: string | null; message: string }
  >(null);

  async function handlePasskeySignIn(opts?: { silent?: boolean }) {
    if (!canPasskey || passkeyBusy) return;
    setPasskeyBusy(true);
    setPasskeyFallback(null);
    try {
      const attemptedEmail = email.trim() || rememberedPasskeyEmail || null;
      const res = await signInWithPasskey(attemptedEmail || undefined);
      if (!res.ok) {
        if (res.code === "not_found" || res.code === "error") {
          // The stored email likely points at a device without a matching key.
          // Clear it so the CTA stops offering "Continue as …" until re-enrolled.
          if (res.code === "not_found") clearLastPasskeyEmail();
          setPasskeyFallback({ kind: res.code, email: attemptedEmail, message: res.error });
          if (attemptedEmail && !email) setEmail(attemptedEmail);
          if (!opts?.silent) toast.error(res.error);
          return;
        }
        // cancelled / unsupported — stay quiet on auto-attempts.
        if (!opts?.silent && res.code !== "cancelled") toast.error(res.error);
        return;
      }
      toast.success("Welcome back");
    } catch (e: any) {
      if (!opts?.silent) toast.error(e?.message ?? "Passkey sign-in failed");
    } finally {
      setPasskeyBusy(false);
    }
  }

  // Auto-invoke passkey sign-in on home-screen launch when the remembered
  // email is available. Gated to standalone display mode so a normal-tab
  // visitor is never prompted unexpectedly. sessionStorage guard prevents a
  // retry loop if the user dismisses the biometric prompt.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!canPasskey || !rememberedPasskeyEmail) return;
    if (otp || checkYourEmail || needsConfirmation) return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    try {
      if (sessionStorage.getItem("ebl.autoPasskeyAttempted") === "1") return;
      sessionStorage.setItem("ebl.autoPasskeyAttempted", "1");
    } catch {
      return;
    }
    void handlePasskeySignIn({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPasskey, rememberedPasskeyEmail]);

  // ---------- 2FA / OTP state ----------
  // `otp.type = 'signup'`  → confirming a new account (token from signup email)
  // `otp.type = 'email'`   → second factor after password sign-in
  const [otp, setOtp] = useState<null | { email: string; type: "signup" | "email"; sentAt: number }>(null);
  const [code, setCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [resendAt, setResendAt] = useState(0); // epoch ms when resend re-enables
  const [trustDevice, setTrustDevice] = useState(true);


  // Tick every second while an OTP screen is active.
  useEffect(() => {
    if (!otp) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [otp]);

  const secondsLeft = otp ? Math.max(0, Math.ceil((otp.sentAt + OTP_TTL_SECONDS * 1000 - now) / 1000)) : 0;
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = otp !== null && secondsLeft === 0;

  // Redirect signed-in users away — carry plan intent into upgrade, or return
  // to the `next` param (e.g. OAuth consent) when supplied.
  useEffect(() => {
    if (session && !loading) {
      if (next) {
        // Same-origin path validated in validateAuthSearch.
        window.location.assign(next);
        return;
      }
      if (intendsPremium && plan) {
        clearPlanIntent();
        navigate({ to: "/app/upgrade", search: { plan } });
      } else {
        if (plan === "free") clearPlanIntent();
        navigate({ to: "/app" });
      }
    }
  }, [session, loading, navigate, intendsPremium, plan, next]);

  const pwScore = useMemo(() => passwordStrength(password), [password]);

  function validate(): boolean {
    const next: typeof errors = {};
    const e = emailSchema.safeParse(email);
    if (!e.success) next.email = e.error.issues[0]?.message;
    if (mode === "signup") {
      const p = passwordSchema.safeParse(password);
      if (!p.success) next.password = p.error.issues[0]?.message;
      const n = nameSchema.safeParse(name);
      if (!n.success) next.name = n.error.issues[0]?.message;
    } else {
      if (!password) next.password = "Required";
    }
    setErrors(next);
    setTouched({ email: true, password: true, name: mode === "signup" });
    return Object.keys(next).length === 0;
  }

  function beginOtp(forEmail: string, type: "signup" | "email") {
    setOtp({ email: forEmail, type, sentAt: Date.now() });
    setCode("");
    setOtpError(null);
    setOtpSuccess(false);
    setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        // If email confirmation is required, no session is returned — collect the 6-digit code.
        if (!data.session) {
          beginOtp(email, "signup");
          toast.success("Account created. Enter the 6-digit code we emailed you.");
        } else {
          toast.success("Welcome to Ethereal Bodylabs.");
        }
      } else {
        // Step 1 — validate password.
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/email.*not.*confirmed/i.test(error.message)) {
            setNeedsConfirmation(true);
          }
          throw error;
        }
        // Trusted-device shortcut: verify server-side that this browser
        // holds a valid, unrevoked token for the user before skipping 2FA.

        const trustedToken = getTrustedToken(email);
        let trusted = false;
        if (trustedToken) {
          try {
            const res = await checkTrustedDevice({ data: { email, token: trustedToken } });
            trusted = res.trusted;
            if (!trusted) clearTrustedToken(email);
          } catch {
            trusted = false;
          }
        }
        if (trusted) {
          toast.success("Welcome back. Trusted device — skipping 2FA.");
          // Session from signInWithPassword is kept; redirect useEffect will navigate.
        } else {
          // Step 2 — enforce email 2FA: drop the password session and require a fresh OTP.
          await supabase.auth.signOut();
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
          });
          if (otpErr) throw otpErr;
          beginOtp(email, "email");
          toast.success("Password verified. Enter the 6-digit code we emailed you.");
        }

      }
    } catch (err: any) {
      const msg = friendlyError(err?.message);
      setErrors((prev) => ({ ...prev, form: msg }));
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    setErrors({});
    setOauthBusy(provider);
    try {
      // Google/Apple work for both new and existing users in one call —
      // first-time sign-in provisions the account automatically. No mode split.
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: callbackUrl,
        extraParams:
          provider === "google" ? { prompt: "select_account" } : undefined,
      });
      if (result.error) throw result.error;
      // If popup flow completed, session is now set; useEffect will navigate.
    } catch (e: any) {
      setErrors({ form: e?.message ?? `${provider} sign-in failed` });
    } finally {
      setOauthBusy(null);
    }
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!otp) return;
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    if (expired) {
      setOtpError("This code has expired. Tap resend for a new one.");
      return;
    }
    setOtpBusy(true);
    setOtpError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otp.email,
        token,
        type: otp.type,
      });
      if (error) throw error;
      // Persist a server-side trusted-device token so future sign-ins on
      // this browser can skip 2FA. verifyOtp set the session, so the
      // authenticated middleware on issueTrustedDevice will see the user.
      if (trustDevice && otp.type === "email") {
        try {
          const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : null;
          const { token: issued } = await issueTrustedDevice({ data: { label: ua ?? undefined } });
          saveTrustedToken(otp.email, issued);
        } catch (e) {
          console.warn("trusted device issue failed", e);
        }
      }
      setOtpSuccess(true);
      toast.success(otp.type === "signup" ? "Email verified. Welcome." : "Verified. Signing you in.");
      // Session is set by verifyOtp; the redirect useEffect will navigate.

    } catch (err: any) {
      const msg = friendlyError(err?.message);
      setOtpError(msg || "That code didn't work. Double-check and try again.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function resendCode() {
    if (!otp || resendIn > 0) return;
    setOtpBusy(true);
    setOtpError(null);
    try {
      if (otp.type === "signup") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: otp.email,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: otp.email,
          options: { shouldCreateUser: false, emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
      }
      setOtp({ ...otp, sentAt: Date.now() });
      setCode("");
      setResendAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
      toast.success("New code sent.");
    } catch (e: any) {
      setOtpError(friendlyError(e?.message) || "Couldn't send a new code. Try again shortly.");
    } finally {
      setOtpBusy(false);
    }
  }

  function cancelOtp() {
    setOtp(null);
    setCode("");
    setOtpError(null);
    setOtpSuccess(false);
  }

  // ---------- OTP / 2FA verification screen ----------
  if (otp) {
    const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const ss = (secondsLeft % 60).toString().padStart(2, "0");
    return (
      <Shell>
        <button
          onClick={cancelOtp}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <div
          className={
            "mx-auto flex size-14 items-center justify-center rounded-2xl border transition-colors " +
            (otpSuccess
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              : expired
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-primary/30 bg-primary/10 text-primary")
          }
        >
          {otpSuccess ? <Check className="size-6" /> : <ShieldCheck className="size-6" />}
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {otpSuccess ? "You're verified." : otp.type === "signup" ? "Confirm your email." : "Two-factor check."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {otpSuccess ? (
            "Redirecting you into your lab…"
          ) : (
            <>
              Enter the 6-digit code we sent to{" "}
              <span className="text-foreground">{otp.email}</span>.
            </>
          )}
        </p>

        {!otpSuccess && (
          <form onSubmit={verifyCode} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Verification code
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpError) setOtpError(null);
                }}
                aria-invalid={!!otpError}
                autoFocus
                className={
                  "h-14 w-full rounded-xl border bg-surface-2 px-4 text-center text-2xl font-mono tracking-[0.5em] text-foreground outline-none transition-colors focus:ring-2 " +
                  (otpError
                    ? "border-destructive/60 focus:border-destructive focus:ring-destructive/30"
                    : "border-border/60 focus:border-primary focus:ring-primary/30")
                }
                placeholder="000000"
              />
            </label>

            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <span className={expired ? "text-destructive" : ""}>
                {expired ? "Code expired" : `Expires in ${mm}:${ss}`}
              </span>
              <button
                type="button"
                onClick={resendCode}
                disabled={resendIn > 0 || otpBusy}
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>

            {otpError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {otpError}
              </div>
            )}

            {otp.type === "email" && (
              <label className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface-2/60 px-3 py-2.5 text-xs text-muted-foreground cursor-pointer select-none hover:border-border">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border/60 text-primary focus:ring-primary/40"
                />
                <span>
                  <span className="text-foreground font-medium">Remember this device for 30 days</span>
                  <span className="block text-[11px] text-muted-foreground/80">
                    Skip the 2FA email on this browser. Don't tick this on a shared or public device.
                  </span>
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={otpBusy || code.length !== 6 || expired}
              className="mt-1 h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium tracking-wide shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {otpBusy && <Loader2 className="size-4 animate-spin" />}
              Verify & continue
            </button>

            <p className="pt-2 text-center text-[11px] text-muted-foreground/80">
              Didn't get it? Check spam, or resend after the timer.
            </p>
          </form>
        )}
      </Shell>
    );
  }


  return (
    <Shell>
      <Link to="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Sparkles className="size-4 text-primary" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Ethereal Bodylabs</span>
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">
        Enter your lab.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One tap to sign in or create your account — we'll figure out the rest.
      </p>

      {planInvalid && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
        >
          <div className="font-medium text-destructive">That plan isn't available</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            The link you followed referenced an unknown plan. Continue below and pick a plan
            on the <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground">pricing page</Link>,
            or{" "}
            <button
              type="button"
              onClick={() => {
                savePlanIntent("premium_monthly");
                setEffectivePlan("premium_monthly");
                navigate({ to: "/auth", search: { plan: "premium_monthly", mode }, replace: true });
              }}
              className="underline underline-offset-2 hover:text-foreground"
            >
              start the Premium trial
            </button>.
          </div>
        </div>
      )}

      {intendsPremium && (
        <div className="mt-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">
                {plan === "premium_yearly" ? "Premium · Yearly selected" : "Premium · Monthly selected"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {plan === "premium_yearly"
                  ? "$129.99/yr after your 30-day free trial. We'll take you to checkout after sign-up."
                  : "$12.99/mo after your 30-day free trial. We'll take you to checkout after sign-up."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next: PlanIntent = plan === "premium_yearly" ? "premium_monthly" : "premium_yearly";
                savePlanIntent(next);
                setEffectivePlan(next);
                navigate({ to: "/auth", search: { plan: next, mode }, replace: true });
              }}
              className="shrink-0 rounded-md border border-primary/40 bg-background/60 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              {plan === "premium_yearly" ? "Switch to monthly" : "Switch to yearly"}
            </button>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            Yearly saves ~17% vs monthly. <Link to="/pricing" className="underline underline-offset-2 hover:text-foreground">Compare plans</Link>
          </div>
        </div>
      )}
      {plan === "free" && (
        <div className="mt-5 rounded-xl border border-border/60 bg-surface-1/60 px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">Free account selected</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                No card required. You can upgrade to Premium anytime.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next: PlanIntent = "premium_monthly";
                savePlanIntent(next);
                setEffectivePlan(next);
                navigate({ to: "/auth", search: { plan: next, mode }, replace: true });
              }}
              className="shrink-0 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
            >
              Try Premium
            </button>
          </div>
        </div>
      )}

      {/* OAuth — identical entry point for new and returning users.
          First-time Google/Apple users are provisioned automatically by
          useAuth's profile upsert; returning users just resume their session. */}
      <div className="mt-6 space-y-2">
        {canPasskey && mode === "signin" && (
          <button
            onClick={() => handlePasskeySignIn()}
            disabled={passkeyBusy || busy || !!oauthBusy}
            aria-label="Sign in with a passkey using Face ID, Touch ID, or your device biometrics"
            className="h-11 w-full rounded-xl border border-primary/40 bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {passkeyBusy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {rememberedPasskeyEmail ? `Continue as ${rememberedPasskeyEmail}` : "Sign in with a passkey"}
          </button>
        )}
        {passkeyFallback && mode === "signin" && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100 space-y-2"
          >
            <div className="font-semibold">
              {passkeyFallback.kind === "not_found"
                ? "No passkey found on this device"
                : "Passkey sign-in didn't complete"}
            </div>
            <p className="text-amber-900/80 dark:text-amber-100/80">
              {passkeyFallback.kind === "not_found"
                ? "Sign in another way below, then re-enrol this device from Profile → Passkeys."
                : passkeyFallback.message}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => oauth("google")}
                className="h-8 px-3 rounded-lg bg-white/80 border border-amber-500/40 text-[11px] font-medium inline-flex items-center gap-1.5"
              >
                <GoogleIcon /> Google
              </button>
              <button
                type="button"
                onClick={() => oauth("apple")}
                className="h-8 px-3 rounded-lg bg-white/80 border border-amber-500/40 text-[11px] font-medium inline-flex items-center gap-1.5"
              >
                <AppleIcon /> Apple
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasskeyFallback(null);
                  (document.querySelector('input[type="password"], input[type="text"][autocomplete="current-password"]') as HTMLInputElement | null)?.focus();
                }}
                className="h-8 px-3 rounded-lg bg-white/80 border border-amber-500/40 text-[11px] font-medium"
              >
                Use email & password
              </button>
              <button
                type="button"
                onClick={() => setPasskeyFallback(null)}
                className="h-8 px-3 rounded-lg text-[11px] text-amber-900/70 dark:text-amber-100/70 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => oauth("google")}
          disabled={!!oauthBusy || busy}
          aria-label="Continue with Google — signs you in or creates your account"
          className="h-11 w-full rounded-xl border border-border/60 bg-surface-2 text-sm font-medium hover:border-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {oauthBusy === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>
        <button
          onClick={() => oauth("apple")}
          disabled={!!oauthBusy || busy}
          aria-label="Continue with Apple — signs you in or creates your account"
          className="h-11 w-full rounded-xl border border-border/60 bg-surface-2 text-sm font-medium hover:border-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {oauthBusy === "apple" ? <Loader2 className="size-4 animate-spin" /> : <AppleIcon />}
          Continue with Apple
        </button>
        <p className="pt-1 text-center text-[11px] text-muted-foreground/80">
          New or returning — same button. First-time users get a lab provisioned automatically.
        </p>
      </div>

      <div className="my-5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <div className="flex-1 h-px bg-border/60" />
        {mode === "signin" ? "or sign in with email" : "or sign up with email"}
        <div className="flex-1 h-px bg-border/60" />
      </div>


      <form onSubmit={submit} noValidate className="space-y-3">
        {mode === "signup" && (
          <Field
            label="Display name"
            value={name}
            onChange={(v) => { setName(v); if (touched.name) setErrors((p) => ({ ...p, name: undefined })); }}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            error={touched.name ? errors.name : undefined}
            autoComplete="name"
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); if (touched.email) setErrors((p) => ({ ...p, email: undefined })); }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? errors.email : undefined}
          autoComplete="email"
          required
        />
        <div>
          <Field
            label="Password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(v) => { setPassword(v); if (touched.password) setErrors((p) => ({ ...p, password: undefined })); }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={touched.password ? errors.password : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          {mode === "signup" && password.length > 0 && (
            <PasswordMeter score={pwScore} />
          )}
        </div>

        {errors.form && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.form}
            {needsConfirmation && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: "signup",
                      email,
                      options: { emailRedirectTo: callbackUrl },
                    });
                    if (error) throw error;
                    beginOtp(email, "signup");
                    toast.success("New code sent. Check your inbox.");
                  } catch (e: any) {
                    toast.error(friendlyError(e?.message) || "Couldn't resend.");
                  }
                }}
                className="ml-2 underline underline-offset-2"
              >
                Send verification code
              </button>
            )}
          </div>
        )}

        <button
          disabled={busy || !!oauthBusy}
          type="submit"
          className="mt-2 h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium tracking-wide shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrors({});
            setTouched({});
            setNeedsConfirmation(false);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "No account yet? Create one." : "Already have an account? Sign in."}
        </button>
        {mode === "signin" && (
          <RouterLink to="/forgot-password" className="text-muted-foreground hover:text-primary">
            Forgot your password?
          </RouterLink>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        By continuing you agree to our terms and acknowledge our privacy notice.
      </p>
    </Shell>
  );
}

// ---------- Sub-components ----------
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  error,
  trailing,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  error?: string;
  trailing?: React.ReactNode;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={
            "h-11 w-full rounded-xl border bg-surface-2 px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-2 " +
            (error
              ? "border-destructive/60 focus:border-destructive focus:ring-destructive/30"
              : "border-border/60 focus:border-primary focus:ring-primary/30") +
            (trailing ? " pr-10" : "")
          }
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>
        )}
      </div>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function PasswordMeter({ score }: { score: number }) {
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = [
    "bg-destructive",
    "bg-destructive/80",
    "bg-amber-500",
    "bg-yellow-400",
    "bg-emerald-500",
    "bg-emerald-400",
  ];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={
              "h-1 flex-1 rounded-full " +
              (i < score ? colors[score] : "bg-border/60")
            }
          />
        ))}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {labels[score]}
      </span>
    </div>
  );
}

function friendlyError(message?: string): string {
  if (!message) return "Something went wrong. Try again.";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (m.includes("email not confirmed")) return "Confirm your email to sign in.";
  if (m.includes("user already registered")) return "An account with that email already exists.";
  if (m.includes("password") && m.includes("pwned")) return "That password has appeared in a data breach. Choose another.";
  if (m.includes("rate limit")) return "Too many attempts. Try again in a minute.";
  return message;
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.8 14.6 3 12 3 6.9 3 2.8 7.1 2.8 12.2S6.9 21.4 12 21.4c6.9 0 9.4-4.8 9.4-8.4 0-.6 0-1-.2-1.6H12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M16.365 12.32c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.46-1.6-2.99-1.62-1.27-.13-2.48.75-3.13.75-.65 0-1.65-.73-2.72-.71-1.4.02-2.7.81-3.42 2.06-1.46 2.53-.37 6.27 1.05 8.32.7 1 1.52 2.13 2.6 2.09 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.84-1.02 2.53-2.03.8-1.17 1.13-2.3 1.14-2.36-.03-.01-2.19-.84-2.21-3.38zM14.35 5.3c.57-.7.96-1.66.85-2.62-.82.03-1.83.55-2.42 1.24-.52.61-.98 1.6-.86 2.53.92.07 1.85-.46 2.43-1.15z" />
    </svg>
  );
}

// Icon consumed to satisfy tree-shaking; keep import list clean.
void Check;
