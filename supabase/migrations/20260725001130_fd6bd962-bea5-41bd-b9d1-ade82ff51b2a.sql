
CREATE TABLE public.blood_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_mime TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  collected_on DATE,
  lab_name TEXT,
  markers JSONB,
  analysis_md TEXT,
  summary TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_reports TO authenticated;
GRANT ALL ON public.blood_reports TO service_role;
ALTER TABLE public.blood_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY blood_reports_owner_all ON public.blood_reports FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER blood_reports_set_updated_at BEFORE UPDATE ON public.blood_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY bloodwork_owner_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bloodwork' AND owner = auth.uid());
CREATE POLICY bloodwork_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bloodwork' AND owner = auth.uid());
CREATE POLICY bloodwork_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bloodwork' AND owner = auth.uid());
