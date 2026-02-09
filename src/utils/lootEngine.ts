import { LootItem, LootRarity, LootDropState, RARITY_CONFIG, ActiveStatBonus } from '@/types/loot';
import { PlayerStats } from '@/types/player';
import { LOOT_TABLE } from '@/data/lootTable';

// ── Drop Chance Logic ────────────────────────────────────────────────
// Guaranteed drop every 3rd quest. Pity system increases rare chance on streaks.

const BASE_DROP_CHANCE = 0.35; // 35% base chance per quest
const PITY_GUARANTEE = 3;     // Guaranteed drop every 3 quests
const PITY_RARE_BOOST = 0.05; // Each pity point adds 5% to rare+ chance

/**
 * Determines if a loot drop should occur after quest completion.
 */
export function shouldDrop(state: LootDropState): boolean {
  // Pity guarantee
  if (state.questsSinceLastDrop + 1 >= PITY_GUARANTEE) return true;
  return Math.random() < BASE_DROP_CHANCE;
}

/**
 * Roll a rarity tier, influenced by pity counter and streak.
 */
export function rollRarity(pityCounter: number, playerStreak: number): LootRarity {
  const rarities: LootRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  // Build weighted pool, boosted by pity and streak
  const streakBonus = Math.min(playerStreak * 0.01, 0.15); // Max 15% from streak
  const pityBonus = pityCounter * PITY_RARE_BOOST;
  const rareBoost = pityBonus + streakBonus;

  const weights = rarities.map(r => {
    let w = RARITY_CONFIG[r].dropWeight;
    if (r === 'rare') w += rareBoost * 20;
    if (r === 'epic') w += rareBoost * 10;
    if (r === 'legendary') w += rareBoost * 3;
    return w;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < rarities.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return rarities[i];
  }

  return 'common';
}

/**
 * Select a loot item matching rarity and stat affinity.
 * Falls back to 'any' affinity, then random same-rarity.
 */
export function selectLoot(
  rarity: LootRarity,
  statAffinity: keyof PlayerStats,
  acquiredIds: string[]
): LootItem | null {
  // Prefer unacquired items matching stat + rarity
  const statMatches = LOOT_TABLE.filter(
    l => l.rarity === rarity && (l.statAffinity === statAffinity || l.statAffinity === 'any') && !acquiredIds.includes(l.id)
  );
  if (statMatches.length > 0) {
    return statMatches[Math.floor(Math.random() * statMatches.length)];
  }

  // Fallback: any unacquired item of this rarity
  const rarityMatches = LOOT_TABLE.filter(
    l => l.rarity === rarity && !acquiredIds.includes(l.id)
  );
  if (rarityMatches.length > 0) {
    return rarityMatches[Math.floor(Math.random() * rarityMatches.length)];
  }

  // All items of this rarity acquired — allow re-drops for stat bonuses only
  const redroppable = LOOT_TABLE.filter(
    l => l.rarity === rarity && l.category === 'stat_bonus'
  );
  if (redroppable.length > 0) {
    return redroppable[Math.floor(Math.random() * redroppable.length)];
  }

  return null;
}

/**
 * Main loot drop orchestrator. Returns the dropped item or null.
 */
export function processLootDrop(
  state: LootDropState,
  questStat: keyof PlayerStats,
  playerStreak: number
): { item: LootItem | null; updatedState: LootDropState } {
  const nextState = { ...state, questsSinceLastDrop: state.questsSinceLastDrop + 1 };

  if (!shouldDrop(state)) {
    return { item: null, updatedState: { ...nextState, pityCounter: nextState.pityCounter + 1 } };
  }

  const rarity = rollRarity(state.pityCounter, playerStreak);
  const item = selectLoot(rarity, questStat, state.acquiredLootIds);

  if (!item) {
    return { item: null, updatedState: { ...nextState, pityCounter: nextState.pityCounter + 1 } };
  }

  return {
    item,
    updatedState: {
      ...nextState,
      questsSinceLastDrop: 0,
      pityCounter: 0,
      acquiredLootIds: [...state.acquiredLootIds, item.id],
      activeStatBonuses: item.statBonus
        ? [...state.activeStatBonuses, createStatBonus(item)]
        : state.activeStatBonuses,
      equippedLootTitle: item.titleValue ?? state.equippedLootTitle,
      totalDrops: state.totalDrops + 1,
    },
  };
}

function createStatBonus(item: LootItem): ActiveStatBonus {
  const expires = new Date();
  expires.setDate(expires.getDate() + (item.statBonus?.durationDays ?? 1));
  return {
    lootId: item.id,
    stat: item.statBonus!.stat,
    amount: item.statBonus!.amount,
    expiresAt: expires.toISOString(),
  };
}

/**
 * Clean up expired stat bonuses.
 */
export function cleanExpiredBonuses(bonuses: ActiveStatBonus[]): ActiveStatBonus[] {
  const now = new Date().toISOString();
  return bonuses.filter(b => b.expiresAt > now);
}

/**
 * Determine if an item warrants a full-screen cinematic reveal.
 */
export function isCinematicDrop(rarity: LootRarity): boolean {
  return rarity === 'rare' || rarity === 'epic' || rarity === 'legendary';
}
