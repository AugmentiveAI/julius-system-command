import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShadowCategory } from '@/types/shadowArmy';
import { DungeonObjective } from '@/types/dungeon';
import { SystemIntelligence } from '@/types/systemIntelligence';

interface UseAutoDeployIntelligenceArgs {
  intelligence: SystemIntelligence | null;
  addShadow: (name: string, category: ShadowCategory, description?: string) => Promise<{ data?: unknown } | null | undefined>;
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

/**
 * Auto-deploys System Intelligence suggestions (shadows + dungeons).
 *
 * In-memory dedupe via `autoDeployedRef` prevents repeat inserts in the same
 * session. PR1b will replace this with a server-side idempotency ledger keyed
 * on `${user_id}:${date}:${suggestion_id}:${kind}`.
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
      // Shadows
      for (const shadow of intelligence.suggestedShadows || []) {
        if (cancelled) return;
        const key = `shadow:${shadow.name}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);
        const result = await addShadow(shadow.name, shadow.category as ShadowCategory, shadow.description);
        if (result?.data) {
          onShadowDeployed(shadow.name);
          addNotification(
            'shadow_extracted',
            'Shadow Auto-Deployed',
            `"${shadow.name}" extracted by System Intelligence.`,
            { shadowName: shadow.name },
          );
        }
      }

      // Dungeons
      for (const dungeon of intelligence.suggestedDungeons || []) {
        if (cancelled) return;
        const key = `dungeon:${dungeon.title}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);
        const objectives: DungeonObjective[] = dungeon.objectives.map((title: string, i: number) => ({
          id: `obj-${i}`,
          title,
          completed: false,
        }));
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        await supabase.from('dungeons').insert({
          user_id: userData.user.id,
          dungeon_type: dungeon.type,
          title: dungeon.title,
          description: dungeon.description,
          difficulty: dungeon.difficulty,
          xp_reward: dungeon.xpReward,
          objectives: objectives as unknown as DungeonObjective[],
          status: 'available',
        });
      }
    })();

    return () => { cancelled = true; };
  }, [intelligence, addShadow, onShadowDeployed, addNotification]);
}
