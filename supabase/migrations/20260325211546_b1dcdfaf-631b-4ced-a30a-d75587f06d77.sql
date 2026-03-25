
-- Quest Chains table
CREATE TABLE IF NOT EXISTS public.quest_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  chain_type text NOT NULL DEFAULT 'narrative',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  total_steps integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  xp_per_step integer NOT NULL DEFAULT 50,
  bonus_xp integer NOT NULL DEFAULT 100,
  stat text NOT NULL DEFAULT 'systems',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.quest_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quest chains" ON public.quest_chains FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quest chains" ON public.quest_chains FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quest chains" ON public.quest_chains FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quest chains" ON public.quest_chains FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Skill mastery tracking table
CREATE TABLE IF NOT EXISTS public.skill_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_id text NOT NULL,
  current_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  max_level integer NOT NULL DEFAULT 5,
  times_used integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skill mastery" ON public.skill_mastery FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skill mastery" ON public.skill_mastery FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skill mastery" ON public.skill_mastery FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own skill mastery" ON public.skill_mastery FOR DELETE TO authenticated USING (auth.uid() = user_id);
