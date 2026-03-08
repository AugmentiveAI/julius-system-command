
CREATE TABLE public.training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workout_type TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_volume INTEGER DEFAULT 0,
  fatigue_score INTEGER,
  readiness_pre INTEGER,
  genetic_phase TEXT,
  sprint_count INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.training_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training_log" ON public.training_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training_log" ON public.training_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training_log" ON public.training_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training_log" ON public.training_log
  FOR DELETE USING (auth.uid() = user_id);
