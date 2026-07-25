
-- Device push tokens (APNs / FCM)
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox','production')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON public.device_push_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON public.device_push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Extend subscriptions for Apple StoreKit
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe','apple')),
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_product_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_apple_orig_tx
  ON public.subscriptions(apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
