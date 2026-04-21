-- Auto-deploy idempotency ledger
-- Prevents duplicate insertion of suggested shadows/dungeons across renders, retries, or sessions.

CREATE TABLE public.auto_deploy_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('shadow', 'dungeon')),
  suggestion_id TEXT NOT NULL,
  deployed_entity_id UUID,
  deploy_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT auto_deploy_ledger_idem_unique UNIQUE (idempotency_key)
);

CREATE INDEX idx_auto_deploy_ledger_user_date ON public.auto_deploy_ledger (user_id, deploy_date DESC);
CREATE INDEX idx_auto_deploy_ledger_user_kind ON public.auto_deploy_ledger (user_id, kind);

ALTER TABLE public.auto_deploy_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger entries"
ON public.auto_deploy_ledger
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ledger entries"
ON public.auto_deploy_ledger
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Append-only: no UPDATE or DELETE policies (denies by default with RLS enabled).
