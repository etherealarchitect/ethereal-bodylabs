-- Dose compounds catalog (user's own + shared seed rows where user_id is null)
CREATE TABLE public.dose_compounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  default_unit text,
  default_method text,
  half_life_hours numeric,
  common_brand text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dose_compounds TO authenticated;
GRANT ALL ON public.dose_compounds TO service_role;
ALTER TABLE public.dose_compounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dose_compounds_read_own_or_shared" ON public.dose_compounds
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "dose_compounds_insert_own" ON public.dose_compounds
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "dose_compounds_update_own" ON public.dose_compounds
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "dose_compounds_delete_own" ON public.dose_compounds
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX ix_dose_compounds_user_name ON public.dose_compounds (user_id, name);

-- Dose schedules
CREATE TABLE public.dose_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compound_id uuid REFERENCES public.dose_compounds(id) ON DELETE SET NULL,
  compound_name text NOT NULL,
  dose_amount numeric NOT NULL,
  dose_unit text NOT NULL,
  method text NOT NULL,
  injection_site text,
  frequency_type text NOT NULL DEFAULT 'interval', -- 'interval' | 'weekly' | 'as_needed'
  interval_days integer,           -- when frequency_type='interval'
  weekdays smallint[],             -- 0=Sun..6=Sat, when frequency_type='weekly'
  time_of_day time,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dose_schedules TO authenticated;
GRANT ALL ON public.dose_schedules TO service_role;
ALTER TABLE public.dose_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dose_schedules_owner_all" ON public.dose_schedules
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX ix_dose_schedules_user_active ON public.dose_schedules (user_id, active);
CREATE TRIGGER trg_dose_schedules_updated
  BEFORE UPDATE ON public.dose_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dose logs
CREATE TABLE public.dose_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.dose_schedules(id) ON DELETE SET NULL,
  compound_name text NOT NULL,
  dose_amount numeric NOT NULL,
  dose_unit text NOT NULL,
  method text NOT NULL,
  injection_site text,
  scheduled_at timestamptz,
  taken_at timestamptz,
  status text NOT NULL DEFAULT 'taken', -- 'taken' | 'skipped' | 'missed'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dose_logs TO authenticated;
GRANT ALL ON public.dose_logs TO service_role;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dose_logs_owner_all" ON public.dose_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX ix_dose_logs_user_taken ON public.dose_logs (user_id, taken_at DESC);
CREATE INDEX ix_dose_logs_user_scheduled ON public.dose_logs (user_id, scheduled_at DESC);

-- Seed shared compound library (user_id is null → visible to all authenticated users)
INSERT INTO public.dose_compounds (user_id, name, category, default_unit, default_method, half_life_hours, notes) VALUES
  (NULL, 'Testosterone Cypionate', 'TRT', 'mg', 'IM', 192, 'Long-ester injectable testosterone'),
  (NULL, 'Testosterone Enanthate', 'TRT', 'mg', 'IM', 168, 'Long-ester injectable testosterone'),
  (NULL, 'Testosterone Propionate', 'TRT', 'mg', 'SubQ', 20, 'Short-ester injectable testosterone'),
  (NULL, 'HCG', 'TRT', 'IU', 'SubQ', 24, 'Human chorionic gonadotropin'),
  (NULL, 'Anastrozole', 'AI', 'mg', 'Oral', 50, 'Aromatase inhibitor'),
  (NULL, 'Enclomiphene', 'SERM', 'mg', 'Oral', 24, 'Selective estrogen receptor modulator'),
  (NULL, 'Semaglutide', 'GLP-1', 'mg', 'SubQ', 165, 'Weekly GLP-1 agonist'),
  (NULL, 'Tirzepatide', 'GLP-1/GIP', 'mg', 'SubQ', 120, 'Weekly dual agonist'),
  (NULL, 'BPC-157', 'Peptide', 'mcg', 'SubQ', 4, 'Healing peptide'),
  (NULL, 'TB-500', 'Peptide', 'mg', 'SubQ', 60, 'Recovery peptide'),
  (NULL, 'Ipamorelin', 'Peptide', 'mcg', 'SubQ', 2, 'GH secretagogue'),
  (NULL, 'CJC-1295 (no DAC)', 'Peptide', 'mcg', 'SubQ', 0.5, 'GHRH analog'),
  (NULL, 'CJC-1295 (DAC)', 'Peptide', 'mcg', 'SubQ', 192, 'Long-acting GHRH analog'),
  (NULL, 'MK-677 (Ibutamoren)', 'Peptide', 'mg', 'Oral', 24, 'Oral GH secretagogue'),
  (NULL, 'Melanotan II', 'Peptide', 'mcg', 'SubQ', 1, 'Melanocortin analog'),
  (NULL, 'Retatrutide', 'GLP-1/GIP/Glucagon', 'mg', 'SubQ', 144, 'Weekly triple agonist'),
  (NULL, 'NAD+', 'Longevity', 'mg', 'SubQ', 8, 'Injectable NAD+'),
  (NULL, 'Vitamin B12', 'Vitamin', 'mcg', 'IM', 144, 'Methylcobalamin'),
  (NULL, 'Vitamin D3', 'Vitamin', 'IU', 'Oral', 720, 'Cholecalciferol'),
  (NULL, 'Creatine Monohydrate', 'Supplement', 'g', 'Oral', 3, 'Daily loading or maintenance');