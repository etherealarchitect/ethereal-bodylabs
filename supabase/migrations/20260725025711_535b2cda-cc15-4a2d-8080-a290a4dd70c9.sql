
CREATE TABLE public.passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_name text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_passkeys_user_id ON public.passkeys(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passkeys TO authenticated;
GRANT ALL ON public.passkeys TO service_role;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own passkeys" ON public.passkeys FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.passkey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  user_id uuid,
  email text,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);
CREATE INDEX idx_passkey_challenges_expires ON public.passkey_challenges(expires_at);
GRANT ALL ON public.passkey_challenges TO service_role;
ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
