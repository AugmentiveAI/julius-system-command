CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  call_count int DEFAULT 0,
  window_start timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, function_name)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
  ON public.rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
  ON public.rate_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);