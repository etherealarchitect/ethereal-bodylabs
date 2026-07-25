import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import {
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyAuthOptions,
  passkeyAuthVerify,
} from "@/lib/passkeys.functions";

function rpContext() {
  return {
    origin: window.location.origin,
    rpId: window.location.hostname,
  };
}

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export async function platformAuthenticatorSupported(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** Register a new passkey for the currently signed-in user (Face ID / Touch ID / Android biometrics). */
export async function registerPasskey(deviceName?: string): Promise<{ ok: boolean; error?: string }> {
  if (!passkeysSupported()) return { ok: false, error: "This device doesn't support passkeys" };
  const ctx = rpContext();
  const opts = await passkeyRegisterOptions({ data: ctx });
  let attResp;
  try {
    attResp = await startRegistration({ optionsJSON: opts.options as any });
  } catch (e: any) {
    if (e?.name === "InvalidStateError") return { ok: false, error: "This passkey is already registered" };
    return { ok: false, error: e?.message ?? "Registration cancelled" };
  }
  const res = await passkeyRegisterVerify({
    data: { ...ctx, challengeId: opts.challengeId, response: attResp, deviceName },
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

export type PasskeySignInResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * - `cancelled`   – user dismissed the biometric prompt (silent-ok).
       * - `not_found`   – no passkey on this device / email matches server records.
       * - `unsupported` – browser lacks WebAuthn.
       * - `error`       – any other failure.
       */
      code: "cancelled" | "not_found" | "unsupported" | "error";
      error: string;
    };

/**
 * Sign in with a passkey. If `email` is provided, only that user's passkeys
 * are allowed (fastest UX on first tap). If omitted the browser will show
 * every passkey the user has for this site — great for the shell CTA.
 */
export async function signInWithPasskey(email?: string): Promise<PasskeySignInResult> {
  if (!passkeysSupported()) return { ok: false, code: "unsupported", error: "This device doesn't support passkeys" };
  const ctx = rpContext();
  const opts = await passkeyAuthOptions({ data: { ...ctx, email } });
  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: opts.options as any });
  } catch (e: any) {
    const name = e?.name as string | undefined;
    // NotAllowedError covers both user-cancel and "no credential available for this RP".
    // We can't tell them apart from the DOMException alone, so treat as cancelled
    // and let the caller offer fallbacks only if the user retries explicitly.
    if (name === "NotAllowedError" || name === "AbortError") {
      return { ok: false, code: "cancelled", error: e?.message ?? "Sign-in cancelled" };
    }
    return { ok: false, code: "error", error: e?.message ?? "Sign-in failed" };
  }
  const res = await passkeyAuthVerify({
    data: { ...ctx, challengeId: opts.challengeId, response: assertion },
  });
  if (!res.ok) {
    const msg = res.error ?? "Passkey sign-in failed";
    // The server returns "Passkey not recognised" when the credential is gone
    // (e.g. removed from another device, or the local device was re-enrolled).
    const isNotFound = /not recognised|not found/i.test(msg);
    return { ok: false, code: isNotFound ? "not_found" : "error", error: msg };
  }

  // Exchange the token_hash for a Supabase session.
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: res.tokenHash,
  });
  if (error) return { ok: false, code: "error", error: error.message };

  // Remember email so the shell CTA can propose it next time.
  try {
    localStorage.setItem("ebl.lastPasskeyEmail", res.email);
  } catch {
    /* ignore */
  }
  return { ok: true };
}

export function lastPasskeyEmail(): string | null {
  try {
    return localStorage.getItem("ebl.lastPasskeyEmail");
  } catch {
    return null;
  }
}

export function clearLastPasskeyEmail(): void {
  try {
    localStorage.removeItem("ebl.lastPasskeyEmail");
  } catch {
    /* ignore */
  }
}
