-- 1. daily_briefs table
CREATE TABLE public.daily_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brief_date DATE NOT NULL,
  content TEXT NOT NULL,
  strategic_focus TEXT,
  weekly_objective TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, brief_date)
);

CREATE INDEX idx_daily_briefs_user_date ON public.daily_briefs (user_id, brief_date DESC);

ALTER TABLE public.daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily briefs"
  ON public.daily_briefs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily briefs"
  ON public.daily_briefs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily briefs"
  ON public.daily_briefs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_briefs_updated_at
  BEFORE UPDATE ON public.daily_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. timezone + daily_brief_hour on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS daily_brief_hour INTEGER NOT NULL DEFAULT 6 CHECK (daily_brief_hour >= 0 AND daily_brief_hour <= 23);