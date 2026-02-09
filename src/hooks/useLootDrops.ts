import { useState, useEffect, useCallback } from 'react';
import { LootDropState, LootItem, INITIAL_LOOT_STATE } from '@/types/loot';
import { PlayerStats } from '@/types/player';
import { processLootDrop, cleanExpiredBonuses, isCinematicDrop } from '@/utils/lootEngine';

const LOOT_STORAGE_KEY = 'the-system-loot';

function loadLootState(): LootDropState {
  try {
    const stored = localStorage.getItem(LOOT_STORAGE_KEY);
    if (stored) {
      const state: LootDropState = JSON.parse(stored);
      // Clean expired bonuses on load
      return { ...state, activeStatBonuses: cleanExpiredBonuses(state.activeStatBonuses) };
    }
  } catch (e) {
    console.error('Failed to load loot state:', e);
  }
  return INITIAL_LOOT_STATE;
}

interface LootDropResult {
  item: LootItem;
  isCinematic: boolean;
}

export function useLootDrops() {
  const [lootState, setLootState] = useState<LootDropState>(loadLootState);
  const [pendingDrop, setPendingDrop] = useState<LootDropResult | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(LOOT_STORAGE_KEY, JSON.stringify(lootState));
  }, [lootState]);

  /**
   * Call after quest completion to roll for a loot drop.
   * Returns the dropped item (if any) for display.
   */
  const rollForLoot = useCallback((questStat: keyof PlayerStats, playerStreak: number): LootDropResult | null => {
    const { item, updatedState } = processLootDrop(lootState, questStat, playerStreak);
    setLootState(updatedState);

    if (item) {
      const result: LootDropResult = { item, isCinematic: isCinematicDrop(item.rarity) };
      setPendingDrop(result);
      return result;
    }
    return null;
  }, [lootState]);

  const clearPendingDrop = useCallback(() => {
    setPendingDrop(null);
  }, []);

  return {
    lootState,
    pendingDrop,
    rollForLoot,
    clearPendingDrop,
    acquiredLootIds: lootState.acquiredLootIds,
    activeStatBonuses: lootState.activeStatBonuses,
    equippedLootTitle: lootState.equippedLootTitle,
    totalDrops: lootState.totalDrops,
  };
}
