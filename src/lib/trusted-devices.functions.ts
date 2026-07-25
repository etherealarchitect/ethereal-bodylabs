import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new trusted-device token for the currently authenticated user.
 * Called from the OTP-verify success handler when the user checks
 * "Remember this device". Returns the raw token — store it client-side
 * (localStorage); the server keeps only a SHA-256 hash.
 */
export const issueTrustedDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label?: string }) => ({
    label: input?.label ? String(input.label).slice(0, 120) : null,
  }))
  .handler(async ({ data, context }) => {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

    const { error } = await context.supabase.from("trusted_devices").insert({
      user_id: context.userId,
      token_hash: tokenHash,
      label: data.label,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    return { token: rawToken, expiresAt };
  });

/**
 * Check whether a client-supplied token is a valid trusted device for the
 * given email. Runs unauthenticated (used BEFORE OTP verification) via the
 * service-role client so it can resolve user by email and touch last_used_at.
 * Returns { trusted: boolean } — never leaks whether the email exists.
 */
export const checkTrustedDevice = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; token: string }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        token: z.string().min(16).max(512),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = hashToken(data.token);

    // Resolve user by email via Auth Admin API (avoids leaking via profile queries).
    // getUserByEmail exists on the admin API; fall back to listUsers filter.
    let userId: string | null = null;
    try {
      // @ts-expect-error - getUserByEmail is available on the admin API
      const { data: byEmail } = await supabaseAdmin.auth.admin.getUserByEmail(data.email);
      userId = byEmail?.user?.id ?? null;
    } catch {
      // ignore, fall through
    }
    if (!userId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users?.find((u) => u.email?.toLowerCase() === data.email)?.id ?? null;
    }
    if (!userId) return { trusted: false };

    const { data: row, error } = await supabaseAdmin
      .from("trusted_devices")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error || !row) return { trusted: false };

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin.from("trusted_devices").delete().eq("id", row.id);
      return { trusted: false };
    }

    await supabaseAdmin
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id);

    return { trusted: true };
  });

/** Revoke the current device's token (sign out of remembered device). */
export const revokeTrustedDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().min(16).max(512) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tokenHash = hashToken(data.token);
    const { error } = await context.supabase
      .from("trusted_devices")
      .delete()
      .eq("token_hash", tokenHash);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List the signed-in user's trusted devices (for settings). */
export const listTrustedDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("trusted_devices")
      .select("id, label, created_at, last_used_at, expires_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
