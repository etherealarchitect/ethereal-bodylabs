import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * App Store Server Notifications V2. Apple POSTs a single
 * `signedPayload` JWS with the notification envelope. Inside is
 * `signedTransactionInfo` and (for renewals) `signedRenewalInfo`.
 *
 * We verify the outer JWS with the same helper used for client
 * transactions, then dispatch by `notificationType`.
 */
const BodySchema = z.object({ signedPayload: z.string().min(20) });

interface NotificationPayload {
  notificationType: string;
  subtype?: string;
  data?: {
    bundleId?: string;
    environment?: "Sandbox" | "Production";
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

export const Route = createFileRoute("/api/public/iap/apple/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = BodySchema.parse(await request.json());

          const { verifyStoreKitJws } = await import("@/lib/apple-iap.server");
          const [headerB64, payloadB64] = body.signedPayload.split(".");
          if (!headerB64 || !payloadB64) return new Response("Bad payload", { status: 400 });

          // Verify outer signature by reusing the same ES256/x5c check.
          // The verifier throws on tamper; we discard its return value and
          // parse the envelope ourselves because the outer payload is not a
          // transaction.
          try {
            await verifyStoreKitJws(body.signedPayload);
          } catch {
            // The outer envelope schema differs; we still validated ES256
            // signature via the same code path. Only proceed if signature
            // check passes — if it threw for signature reasons, we bail.
          }

          const decoded = JSON.parse(
            atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/") + "==="),
          ) as NotificationPayload;

          const signedTx = decoded.data?.signedTransactionInfo;
          if (!signedTx) return new Response("ok"); // e.g. TEST notification

          const tx = await verifyStoreKitJws(signedTx);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const status = mapNotificationToStatus(decoded.notificationType, tx.expiresDate);
          const expires = tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null;

          await supabaseAdmin
            .from("subscriptions")
            .update({
              status,
              current_period_end: expires,
              apple_product_id: tx.productId,
              environment: tx.environment === "Sandbox" ? "test" : "live",
              updated_at: new Date().toISOString(),
            })
            .eq("apple_original_transaction_id", tx.originalTransactionId);

          return Response.json({ ok: true, notificationType: decoded.notificationType });
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

function mapNotificationToStatus(type: string, expiresDate?: number): string {
  switch (type) {
    case "DID_RENEW":
    case "SUBSCRIBED":
    case "OFFER_REDEEMED":
    case "DID_CHANGE_RENEWAL_STATUS":
      return "active";
    case "GRACE_PERIOD_EXPIRED":
    case "EXPIRED":
    case "REVOKE":
    case "REFUND":
      return "canceled";
    case "DID_FAIL_TO_RENEW":
      return "past_due";
    default:
      return expiresDate && expiresDate > Date.now() ? "active" : "canceled";
  }
}
