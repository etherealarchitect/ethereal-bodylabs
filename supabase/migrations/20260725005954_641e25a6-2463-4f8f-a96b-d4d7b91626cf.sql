
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  label text,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trusted_devices_user_idx ON public.trusted_devices(user_id);
CREATE INDEX trusted_devices_expires_idx ON public.trusted_devices(expires_at);

GRANT SELECT, DELETE ON public.trusted_devices TO authenticated;
GRANT ALL ON public.trusted_devices TO service_role;

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trusted devices"
  ON public.trusted_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users revoke own trusted devices"
  ON public.trusted_devices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
