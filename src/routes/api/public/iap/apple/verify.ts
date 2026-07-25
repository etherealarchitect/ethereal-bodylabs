import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Public POST endpoint used as a fallback path for verifying a StoreKit
 * transaction outside the RPC boundary (e.g. from native retry queues).
 * The primary code path is the `verifyAppleTransaction` server fn.
 *
 * Requires an Authorization: Bearer <supabase access token> header — we
 * validate it manually here since /api/public/* bypasses the built-in
 * auth middleware.
 */
const BodySchema = z.object({ jws: z.string().min(20) });

export const Route = createFileRoute("/api/public/iap/apple/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
          if (!token) return new Response("Unauthorized", { status: 401 });

          const raw = await request.json();
          const { jws } = BodySchema.parse(raw);

          const { createClient } = await import("@supabase/supabase-js");
          const supa = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false } },
          );
          const { data: userData, error: userErr } = await supa.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

          const { verifyStoreKitJws, upsertAppleSubscription } = await import(
            "@/lib/apple-iap.server"
          );
          const claims = await verifyStoreKitJws(jws);
          await upsertAppleSubscription({ userId: userData.user.id, transaction: claims });

          return Response.json({
            ok: true,
            productId: claims.productId,
            expiresDate: claims.expiresDate ?? null,
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ ok: false, error: (err as Error).message }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
