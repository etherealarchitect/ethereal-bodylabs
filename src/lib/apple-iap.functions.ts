import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VerifySchema = z.object({
  jws: z.string().min(20),
});

/**
 * Client posts a signed StoreKit 2 JWSRepresentation. The server verifies
 * the signature against Apple's public keys, extracts the transaction, and
 * upserts the subscription so entitlement unifies with Stripe.
 */
export const verifyAppleTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VerifySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { verifyStoreKitJws, upsertAppleSubscription } = await import(
      "./apple-iap.server"
    );
    const claims = await verifyStoreKitJws(data.jws);
    await upsertAppleSubscription({
      userId: context.userId,
      transaction: claims,
    });
    return {
      productId: claims.productId,
      expiresDate: claims.expiresDate ?? null,
      environment: claims.environment,
    };
  });
