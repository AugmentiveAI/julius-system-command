import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShadowCategory } from '@/types/shadowArmy';
import { DungeonObjective } from '@/types/dungeon';
import { SystemIntelligence } from '@/types/systemIntelligence';

interface UseAutoDeployIntelligenceArgs {
  intelligence: SystemIntelligence | null;
  addShadow: (name: string, category: ShadowCategory, description?: string) => Promise<{ data?: { id?: string } | null } | null | undefined>;
  onShadowDeployed: (name: string) => void;
  addNotification: (
    type: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ) => void;
}

const SETTINGS_KEY = 'systemAISettings';

function isAutoDeployEnabled(): boolean {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').autoDeploy === true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD in UTC, matches the DB default for `deploy_date`. */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Stable suggestion ID — falls back to name/title when upstream payload omits one. */
function suggestionKey(kind: 'shadow' | 'dungeon', s: { id?: string; name?: string; title?: string }): string {
  const raw = s.id ?? s.name ?? s.title ?? 'unknown';
  return raw.toLowerCase().replace(/\s+/g, '-').slice(0, 80);
}

function buildIdempotencyKey(userId: string, date: string, suggestionId: string, kind: 'shadow' | 'dungeon'): string {
  return `${userId}:${date}:${kind}:${suggestionId}`;
}

/**
 * Reserves an idempotency slot in the ledger. Returns `true` if this is the
 * first attempt for the key, `false` if a prior deploy already exists.
 *
 * Relies on the unique constraint on `idempotency_key` — a duplicate insert
 * fails with Postgres error 23505, which we treat as "already deployed".
 */
async function reserveLedgerSlot(args: {
  userId: string;
  key: string;
  kind: 'shadow' | 'dungeon';
  suggestionId: string;
}): Promise<boolean> {
  const { error } = await supabase.from('auto_deploy_ledger').insert({
    user_id: args.userId,
    idempotency_key: args.key,
    kind: args.kind,
    suggestion_id: args.suggestionId,
    status: 'success',
  });
  if (!error) return true;
  if (error.code === '23505') {
    console.info('[auto-deploy] idempotent skip', args.key);
    return false;
  }
  console.warn('[auto-deploy] ledger reservation failed', error);
  return false;
}

/** Records the deployed entity ID against the ledger row (best-effort). */
async function attachEntityId(key: string, entityId: string | undefined) {
  if (!entityId) return;
  await supabase
    .from('auto_deploy_ledger')
    .update({ deployed_entity_id: entityId })
    .eq('idempotency_key', key);
}

/**
 * Auto-deploys System Intelligence suggestions (shadows + dungeons).
 *
 * Idempotency is enforced at the database via `auto_deploy_ledger.idempotency_key`
 * (unique). The in-memory `autoDeployedRef` remains as a fast-path to avoid
 * unnecessary network calls within a session.
 */
export function useAutoDeployIntelligence({
  intelligence,
  addShadow,
  onShadowDeployed,
  addNotification,
}: UseAutoDeployIntelligenceArgs) {
  const autoDeployedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!intelligence) return;
    if (!isAutoDeployEnabled()) return;

    let cancelled = false;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || cancelled) return;
      const userId = userData.user.id;
      const today = todayUTC();

      // Shadows
      for (const shadow of intelligence.suggestedShadows || []) {
        if (cancelled) return;
        const sid = suggestionKey('shadow', shadow);
        const key = buildIdempotencyKey(userId, today, sid, 'shadow');
        if (autoDeployedRef.current.has(key)) continue;

        const reserved = await reserveLedgerSlot({ userId, key, kind: 'shadow', suggestionId: sid });
        autoDeployedRef.current.add(key); // mark either way to avoid retry storms
        if (!reserved) continue;

        const result = await addShadow(shadow.name, shadow.category as ShadowCategory, shadow.description);
        if (result?.data) {
          await attachEntityId(key, result.data.id);
          onShadowDeployed(shadow.name);
          addNotification(
            'shadow_extracted',
            'Shadow Auto-Deployed',
            `"${shadow.name}" extracted by System Intelligence.`,
            { shadowName: shadow.name, idempotencyKey: key },
          );
        }
      }

      // Dungeons
      for (const dungeon of intelligence.suggestedDungeons || []) {
        if (cancelled) return;
        const sid = suggestionKey('dungeon', dungeon);
        const key = buildIdempotencyKey(userId, today, sid, 'dungeon');
        if (autoDeployedRef.current.has(key)) continue;

        const reserved = await reserveLedgerSlot({ userId, key, kind: 'dungeon', suggestionId: sid });
        autoDeployedRef.current.add(key);
        if (!reserved) continue;

        const objectives: DungeonObjective[] = dungeon.objectives.map((title: string, i: number) => ({
          id: `obj-${i}`,
          title,
          completed: false,
        }));
        const { data: inserted } = await supabase
          .from('dungeons')
          .insert([{
            user_id: userId,
            dungeon_type: dungeon.type,
            title: dungeon.title,
            description: dungeon.description,
            difficulty: dungeon.difficulty,
            xp_reward: dungeon.xpReward,
            objectives: objectives as unknown as never,
            status: 'available',
          }])
          .select('id')
          .maybeSingle();
        await attachEntityId(key, inserted?.id);
      }
    })();

    return () => { cancelled = true; };
  }, [intelligence, addShadow, onShadowDeployed, addNotification]);
}
