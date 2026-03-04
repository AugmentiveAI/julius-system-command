import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Player, INITIAL_PLAYER } from '@/types/player';
import { InventoryState, INITIAL_INVENTORY } from '@/types/inventory';
import { HistoryState } from '@/types/history';

const PLAYER_KEY = 'the-system-player';
const INVENTORY_KEY = 'the-system-inventory';
const HISTORY_KEY = 'the-system-history';

function getMigrationFlag(userId: string) {
  return `the-system-migrated-${userId}`;
}

interface LocalData {
  player: Player | null;
  inventory: InventoryState | null;
  history: HistoryState | null;
}

function detectLocalData(): LocalData {
  let player: Player | null = null;
  let inventory: InventoryState | null = null;
  let history: HistoryState | null = null;

  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      // Only count as meaningful if they have XP or a non-default level
      if (p.totalXP > 0 || p.level > 1 || p.streak > 0) {
        player = p;
      }
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    if (raw) {
      const inv = JSON.parse(raw);
      const hasData =
        (inv.activeClients?.length > 0) ||
        (inv.skillsCreated?.length > 0) ||
        (inv.templatesFrameworks?.length > 0) ||
        (inv.automationsDeployed > 0) ||
        (inv.cashReserves > 0);
      if (hasData) inventory = inv;
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const h = JSON.parse(raw);
      if (h.completions?.length > 0) history = h;
    }
  } catch { /* ignore */ }

  return { player, inventory, history };
}

export function useLocalDataMigration() {
  const { user } = useAuth();
  const [showMigration, setShowMigration] = useState(false);
  const [localData, setLocalData] = useState<LocalData>({ player: null, inventory: null, history: null });
  const [migrating, setMigrating] = useState(false);

  // Detect on login
  useEffect(() => {
    if (!user) return;

    const flag = getMigrationFlag(user.id);
    if (localStorage.getItem(flag)) return; // Already migrated

    const data = detectLocalData();
    const hasAnything = data.player || data.inventory || data.history;

    if (hasAnything) {
      setLocalData(data);
      setShowMigration(true);
    } else {
      // No local data to migrate — mark as done
      localStorage.setItem(flag, 'true');
    }
  }, [user]);

  const acceptMigration = useCallback(async () => {
    if (!user) return;
    setMigrating(true);

    try {
      const promises: PromiseLike<any>[] = [];

      if (localData.player) {
        const p = localData.player;
        promises.push(
          supabase.from('player_state').update({
            level: p.level,
            total_xp: p.totalXP,
            current_xp: p.currentXP,
            xp_to_next_level: p.xpToNextLevel,
            stats: p.stats as any,
            streak: p.streak,
            cold_streak: p.coldStreak,
            penalty: p.penalty as any,
          }).eq('user_id', user.id).then()
        );

        promises.push(
          supabase.from('profiles').update({
            display_name: p.name,
            title: p.title,
            goal: p.goal ?? null,
          }).eq('user_id', user.id).then()
        );
      }

      if (localData.inventory) {
        promises.push(
          supabase.from('inventory').update({
            data: localData.inventory as any,
          }).eq('user_id', user.id).then()
        );
      }

      if (localData.history) {
        const rows = localData.history.completions.map(e => ({
          user_id: user.id,
          quest_id: e.questId,
          quest_title: e.questTitle,
          xp_earned: e.xpEarned,
          completed_at: e.completedAt,
          type: e.type,
        }));

        if (rows.length > 0) {
          for (let i = 0; i < rows.length; i += 100) {
            promises.push(
              supabase.from('quest_history').insert(rows.slice(i, i + 100)).then()
            );
          }
        }
      }

      await Promise.all(promises);
      console.log('[Migration] Local data merged to cloud successfully');
    } catch (e) {
      console.error('[Migration] Failed:', e);
    }

    localStorage.setItem(getMigrationFlag(user.id), 'true');
    setShowMigration(false);
    setMigrating(false);

    // Reload to pick up merged data from DB
    window.location.reload();
  }, [user, localData]);

  const skipMigration = useCallback(() => {
    if (!user) return;
    localStorage.setItem(getMigrationFlag(user.id), 'true');
    setShowMigration(false);
  }, [user]);

  const summary = {
    playerLevel: localData.player?.level ?? 0,
    playerXP: localData.player?.totalXP ?? 0,
    questsCompleted: localData.history?.completions?.length ?? 0,
    hasInventory: !!localData.inventory,
  };

  return { showMigration, migrating, summary, acceptMigration, skipMigration };
}
