import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

// --- RP config ---------------------------------------------------------------
// rpID must be the effective domain (no scheme, no port). Origin must include
// the scheme. We pass the effective values from the caller to survive preview
// vs published hosts.
function normaliseRp(input: { origin: string; rpId: string }) {
  const origin = input.origin.replace(/\/+$/, "");
  const url = new URL(origin);
  const rpId = input.rpId || url.hostname;
  return { origin, rpId };
}
const RP_NAME = "ETHEREAL BODYLABS";

// --- helpers -----------------------------------------------------------------
function b64urlToBuffer(b64: string): Uint8Array {
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const b = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}
function bufferToB64url(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function cleanExpiredChallenges() {
  const sb = await admin();
  await (sb.from("passkey_challenges") as any).delete().lt("expires_at", new Date().toISOString());
}

// --- Registration (authed) ---------------------------------------------------

export const passkeyRegisterOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { origin: string; rpId: string }) => d)
  .handler(async ({ data, context }) => {
    const { rpId } = normaliseRp(data);
    const { userId, supabase } = context;
    const { data: userRes } = await supabase.auth.getUser();
    const email = userRes.user?.email ?? "user";

    const { data: existing } = await (await admin())
      .from("passkeys")
      .select("credential_id, transports")
      .eq("user_id", userId);

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      userID: new TextEncoder().encode(userId),
      userName: email,
      userDisplayName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        // omit authenticatorAttachment so both platform (Face ID / Touch ID /
        // Android biometrics) and cross-platform (security key) work.
      },
      excludeCredentials: (existing ?? []).map((c: any) => ({
        id: c.credential_id,
        transports: c.transports ?? undefined,
      })),
    });

    await cleanExpiredChallenges();
    const sb = await admin();
    const { data: row, error } = await (sb.from("passkey_challenges") as any)
      .insert({ challenge: options.challenge, user_id: userId, purpose: "register" })
      .select("id")
      .single();
    if (error) throw error;

    return { options, challengeId: row.id as string };
  });

export const passkeyRegisterVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    origin: string;
    rpId: string;
    challengeId: string;
    response: RegistrationResponseJSON;
    deviceName?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { origin, rpId } = normaliseRp(data);
    const { userId } = context;
    const sb = await admin();

    const { data: ch } = await sb
      .from("passkey_challenges")
      .select("challenge, user_id, purpose, expires_at")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!ch || ch.purpose !== "register" || ch.user_id !== userId) {
      return { ok: false as const, error: "Challenge not found or expired" };
    }
    if (new Date(ch.expires_at as string).getTime() < Date.now()) {
      return { ok: false as const, error: "Challenge expired" };
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: data.response,
        expectedChallenge: ch.challenge as string,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: false,
      });
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }

    if (!verification.verified || !verification.registrationInfo) {
      return { ok: false as const, error: "Verification failed" };
    }
    const { credential } = verification.registrationInfo;
    // simplewebauthn v11: credential.id is a base64url string, credential.publicKey a Uint8Array
    const credentialId = credential.id;
    const publicKey = bufferToB64url(credential.publicKey);

    const { error: insertErr } = await (sb.from("passkeys") as any).insert({
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      counter: credential.counter ?? 0,
      transports: data.response.response.transports ?? [],
      device_name: data.deviceName ?? guessDeviceName(),
      last_used_at: new Date().toISOString(),
    });
    if (insertErr) return { ok: false as const, error: insertErr.message };
    await (sb.from("passkey_challenges") as any).delete().eq("id", data.challengeId);
    return { ok: true as const };
  });

// --- Authentication (public) -------------------------------------------------

export const passkeyAuthOptions = createServerFn({ method: "POST" })
  .inputValidator((d: { origin: string; rpId: string; email?: string }) => d)
  .handler(async ({ data }) => {
    const { rpId } = normaliseRp(data);
    const sb = await admin();

    // Resolve user (if email given) and their credentials
    let userId: string | null = null;
    let allowCredentials: { id: string; transports?: any[] }[] = [];
    if (data.email) {
      // Find user by email via admin API
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = list?.users?.find((x) => x.email?.toLowerCase() === data.email!.toLowerCase());
      if (u) {
        userId = u.id;
        const { data: creds } = await sb
          .from("passkeys")
          .select("credential_id, transports")
          .eq("user_id", u.id);
        allowCredentials = (creds ?? []).map((c: any) => ({ id: c.credential_id, transports: c.transports ?? undefined }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: "preferred",
      allowCredentials: allowCredentials.length ? allowCredentials : undefined,
    });

    await cleanExpiredChallenges();
    const { data: row, error } = await (sb.from("passkey_challenges") as any)
      .insert({ challenge: options.challenge, user_id: userId, email: data.email ?? null, purpose: "auth" })
      .select("id")
      .single();
    if (error) throw error;

    return { options, challengeId: row.id as string };
  });

/**
 * Verify the WebAuthn assertion, then mint a magic-link `token_hash` the
 * client can exchange via `supabase.auth.verifyOtp` to establish a session.
 */
export const passkeyAuthVerify = createServerFn({ method: "POST" })
  .inputValidator((d: {
    origin: string;
    rpId: string;
    challengeId: string;
    response: AuthenticationResponseJSON;
  }) => d)
  .handler(async ({ data }) => {
    const { origin, rpId } = normaliseRp(data);
    const sb = await admin();

    const { data: ch } = await sb
      .from("passkey_challenges")
      .select("challenge, purpose, expires_at")
      .eq("id", data.challengeId)
      .maybeSingle();
    if (!ch || ch.purpose !== "auth") {
      return { ok: false as const, error: "Challenge not found" };
    }
    if (new Date(ch.expires_at as string).getTime() < Date.now()) {
      return { ok: false as const, error: "Challenge expired" };
    }

    const credentialId = data.response.id;
    const { data: pk } = await sb
      .from("passkeys")
      .select("id, user_id, credential_id, public_key, counter, transports")
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!pk) return { ok: false as const, error: "Passkey not recognised" };

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: data.response,
        expectedChallenge: ch.challenge as string,
        expectedOrigin: origin,
        expectedRPID: rpId,
        credential: {
          id: pk.credential_id as string,
          publicKey: b64urlToBuffer(pk.public_key as string),
          counter: Number(pk.counter ?? 0),
          transports: (pk.transports as any) ?? undefined,
        },
        requireUserVerification: false,
      });
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }

    if (!verification.verified) return { ok: false as const, error: "Verification failed" };

    // Update counter + last used, delete challenge.
    await (sb.from("passkeys") as any)
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", pk.id);
    await (sb.from("passkey_challenges") as any).delete().eq("id", data.challengeId);

    // Look up email for this user, then mint a magic-link token_hash.
    const { data: userRes } = await sb.auth.admin.getUserById(pk.user_id as string);
    const email = userRes?.user?.email;
    if (!email) return { ok: false as const, error: "User has no email on file" };

    const { data: linkRes, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (linkErr || !linkRes) return { ok: false as const, error: linkErr?.message ?? "Failed to issue session token" };

    // properties.hashed_token is what verifyOtp accepts on the client.
    const tokenHash = (linkRes.properties as any)?.hashed_token as string | undefined;
    if (!tokenHash) return { ok: false as const, error: "No token_hash returned" };

    return { ok: true as const, tokenHash, email };
  });

// --- Passkey management ------------------------------------------------------

export const listPasskeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("passkeys")
      .select("id, device_name, created_at, last_used_at, transports")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { passkeys: data ?? [] };
  });

export const deletePasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("passkeys").delete().eq("id", data.id).eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const renamePasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const name = data.name.slice(0, 60);
    const { error } = await (supabase.from("passkeys") as any)
      .update({ device_name: name })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

function guessDeviceName(): string {
  return "Passkey";
}
