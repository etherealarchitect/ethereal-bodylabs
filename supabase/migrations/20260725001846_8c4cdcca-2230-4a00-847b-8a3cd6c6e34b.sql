
-- Onboarding + goals on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sex TEXT,
  ADD COLUMN IF NOT EXISTS birth_year INT,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS starting_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS goal TEXT,                  -- 'recomp'|'cut'|'bulk'|'perform'|'longevity'
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,        -- 'sedentary'|'light'|'moderate'|'high'|'athlete'
  ADD COLUMN IF NOT EXISTS training_days_per_week INT,
  ADD COLUMN IF NOT EXISTS kcal_target INT,
  ADD COLUMN IF NOT EXISTS protein_target_g INT;

-- ============ Programs ============
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weeks INT NOT NULL DEFAULT 4,
  days_per_week INT NOT NULL DEFAULT 4,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own programs" ON public.programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER programs_updated BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_index INT NOT NULL,          -- 0..(days_per_week*weeks-1) or 0..6 for weekly
  title TEXT NOT NULL,
  focus TEXT,                       -- 'push'|'pull'|'legs'|'full'|'rest'
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, sets, reps, rest_sec, notes}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_days TO authenticated;
GRANT ALL ON public.program_days TO service_role;
ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own program_days" ON public.program_days FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Meal templates ============
CREATE TABLE IF NOT EXISTS public.meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kcal INT,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  notes TEXT,
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_templates TO authenticated;
GRANT ALL ON public.meal_templates TO service_role;
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal_templates" ON public.meal_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Achievements ============
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,               -- 'first_workout'|'7d_streak'|'30d_streak'|'first_pr' etc
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ Settings ============
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',      -- 'light'|'dark'|'system'
  reminders_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TEXT NOT NULL DEFAULT '07:30',
  weekly_report_day INT NOT NULL DEFAULT 0,  -- 0 = Sunday
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.user_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_settings_updated BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
