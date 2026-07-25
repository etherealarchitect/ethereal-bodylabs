
CREATE TABLE public.alice_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alice_threads_user_recent ON public.alice_threads(user_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_threads TO authenticated;
GRANT ALL ON public.alice_threads TO service_role;
ALTER TABLE public.alice_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.alice_threads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.alice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.alice_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alice_messages_thread ON public.alice_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alice_messages TO authenticated;
GRANT ALL ON public.alice_messages TO service_role;
ALTER TABLE public.alice_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.alice_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_recent ON public.ai_usage_events(created_at DESC);
CREATE INDEX ai_usage_events_feature ON public.ai_usage_events(feature, created_at DESC);
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads usage" ON public.ai_usage_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());
