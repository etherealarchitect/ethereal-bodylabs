
CREATE TABLE public.physique_collages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  start_photo_id UUID REFERENCES public.physique_photos ON DELETE SET NULL,
  current_photo_id UUID REFERENCES public.physique_photos ON DELETE SET NULL,
  start_taken_at TIMESTAMPTZ NOT NULL,
  current_taken_at TIMESTAMPTZ NOT NULL,
  weeks_apart INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.physique_collages TO authenticated;
GRANT ALL ON public.physique_collages TO service_role;
ALTER TABLE public.physique_collages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own collages" ON public.physique_collages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX physique_collages_user_created ON public.physique_collages(user_id, created_at DESC);
