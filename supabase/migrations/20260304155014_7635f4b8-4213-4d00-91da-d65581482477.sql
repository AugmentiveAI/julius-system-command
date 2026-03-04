
-- Shadow Army table: tracks compounding assets
CREATE TABLE public.shadow_army (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('automation', 'client', 'content', 'sop', 'skill', 'tool')),
  description TEXT,
  power_level INTEGER NOT NULL DEFAULT 1,
  contribution_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'evolving')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS
ALTER TABLE public.shadow_army ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shadows"
  ON public.shadow_army FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shadows"
  ON public.shadow_army FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shadows"
  ON public.shadow_army FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shadows"
  ON public.shadow_army FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
