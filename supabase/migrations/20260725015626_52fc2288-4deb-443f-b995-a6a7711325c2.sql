
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_href text,
  level text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = 'scottkbrown1337@gmail.com';
$$;

CREATE POLICY "Signed-in users read active announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    active = true
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admin reads all announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Admin inserts announcements"
  ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admin updates announcements"
  ON public.announcements FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admin deletes announcements"
  ON public.announcements FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.announcement_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals"
  ON public.announcement_dismissals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
