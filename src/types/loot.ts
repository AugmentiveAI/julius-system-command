import { PlayerStats } from './player';

// ── Rarity Tiers ─────────────────────────────────────────────────────
export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_CONFIG: Record<LootRarity, {
  label: string;
  color: string;       // HSL for glow/text
  bgClass: string;     // Tailwind classes
  textClass: string;
  borderClass: string;
  glowIntensity: number;
  dropWeight: number;  // Base weight (higher = more common)
}> = {
  common:    { label: 'Common',    color: '215 20% 65%',  bgClass: 'bg-muted',            textClass: 'text-muted-foreground', borderClass: 'border-border',           glowIntensity: 0,   dropWeight: 50 },
  uncommon:  { label: 'Uncommon',  color: '142 76% 46%',  bgClass: 'bg-emerald-950/30',   textClass: 'text-emerald-400',      borderClass: 'border-emerald-800/50',   glowIntensity: 0.3, dropWeight: 30 },
  rare:      { label: 'Rare',      color: '187 100% 50%', bgClass: 'bg-primary/10',       textClass: 'text-primary',          borderClass: 'border-primary/50',       glowIntensity: 0.5, dropWeight: 13 },
  epic:      { label: 'Epic',      color: '263 91% 66%',  bgClass: 'bg-secondary/10',     textClass: 'text-secondary',        borderClass: 'border-secondary/50',     glowIntensity: 0.7, dropWeight: 5  },
  legendary: { label: 'Legendary', color: '45 100% 50%',  bgClass: 'bg-yellow-950/30',    textClass: 'text-yellow-400',       borderClass: 'border-yellow-500/50',    glowIntensity: 1,   dropWeight: 2  },
};

// ── Loot Categories ──────────────────────────────────────────────────
export type LootCategory =
  | 'tactical_insight'    // Actionable business framework/technique
  | 'system_upgrade'      // Unlocks app behavior change
  | 'template'            // Auto-populates inventory
  | 'stat_bonus'          // Temporary stat buff
  | 'title';              // Cosmetic title for dashboard

// ── Loot Item ────────────────────────────────────────────────────────
export interface LootItem {
  id: string;
  name: string;
  description: string;
  category: LootCategory;
  rarity: LootRarity;
  /** Which stat alignment triggers this drop */
  statAffinity: keyof PlayerStats | 'any';
  /** For stat_bonus: which stat and how much */
  statBonus?: { stat: keyof PlayerStats; amount: number; durationDays: number };
  /** For template: auto-add to inventory */
  templateName?: string;
  /** For title: the title string */
  titleValue?: string;
  /** For system_upgrade: description of what changes */
  upgradeEffect?: string;
  /** System voice line on acquisition */
  systemLine: string;
}

// ── Player Loot State ────────────────────────────────────────────────
export interface ActiveStatBonus {
  lootId: string;
  stat: keyof PlayerStats;
  amount: number;
  expiresAt: string; // ISO date
}

export interface LootDropState {
  /** How many quests completed since last drop */
  questsSinceLastDrop: number;
  /** Current pity counter (increases rare chance) */
  pityCounter: number;
  /** All loot ever acquired (IDs) */
  acquiredLootIds: string[];
  /** Currently active stat bonuses */
  activeStatBonuses: ActiveStatBonus[];
  /** Current equipped title (from loot) */
  equippedLootTitle: string | null;
  /** Total drops received */
  totalDrops: number;
}

export const INITIAL_LOOT_STATE: LootDropState = {
  questsSinceLastDrop: 0,
  pityCounter: 0,
  acquiredLootIds: [],
  activeStatBonuses: [],
  equippedLootTitle: null,
  totalDrops: 0,
};
