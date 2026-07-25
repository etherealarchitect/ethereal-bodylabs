import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RegisterTokenSchema = z.object({
  token: z.string().min(32).max(400),
  platform: z.enum(["ios", "android", "web"]),
  environment: z.enum(["sandbox", "production"]).default("production").optional(),
});

/**
 * Registers or refreshes an APNs/FCM device token for the current user.
 * Called from the native shell right after registration succeeds.
 */
export const registerDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RegisterTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("device_push_tokens").upsert(
      {
        user_id: userId,
        token: data.token,
        platform: data.platform,
        environment: data.environment ?? "production",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteTokenSchema = z.object({ token: z.string() });

export const unregisterDeviceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => DeleteTokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("device_push_tokens")
      .delete()
      .eq("token", data.token)
      .eq("user_id", context.userId);
    return { ok: true };
  });

const SendPushSchema = z.object({
  audience: z.enum(["all", "user"]),
  userId: z.string().uuid().optional(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  path: z.string().startsWith("/").optional(),
});

/**
 * Admin-only: dispatch a push notification. Body is left as a stub that
 * calls into an APNs helper on the Cloudflare worker; the helper reads
 * APNS_KEY_ID / APNS_TEAM_ID / APNS_BUNDLE_ID / APNS_AUTH_KEY_P8 from env
 * and signs an ES256 JWT for the /3/device/<token> HTTP/2 endpoint.
 */
export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendPushSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_platform_admin");
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const query = supabaseAdmin.from("device_push_tokens").select("token, platform, environment");
    const { data: rows, error } =
      data.audience === "user" && data.userId
        ? await query.eq("user_id", data.userId)
        : await query;
    if (error) throw new Error(error.message);

    const { sendApnsBatch } = await import("./apns.server");
    const results = await sendApnsBatch(rows ?? [], {
      title: data.title,
      body: data.body,
      path: data.path,
    });
    return { sent: results.sent, failed: results.failed };
  });
