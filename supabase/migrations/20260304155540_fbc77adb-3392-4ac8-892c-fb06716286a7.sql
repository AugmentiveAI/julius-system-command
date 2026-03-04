
-- Dungeons table: tracks boss fights, instant dungeons, and S-Rank unlocks
CREATE TABLE public.dungeons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dungeon_type TEXT NOT NULL CHECK (dungeon_type IN ('boss_fight', 'instant_dungeon', 's_rank_gate')),
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'A-Rank' CHECK (difficulty IN ('B-Rank', 'A-Rank', 'S-Rank', 'SS-Rank')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'expired')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_by JSONB DEFAULT '{}'::jsonb,
  genetic_modifiers JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.dungeons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dungeons"
  ON public.dungeons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dungeons"
  ON public.dungeons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dungeons"
  ON public.dungeons FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dungeons"
  ON public.dungeons FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
