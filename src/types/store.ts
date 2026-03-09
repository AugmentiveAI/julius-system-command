import { PlayerStats } from '@/types/player';

export type ItemCategory = 'consumable' | 'boost' | 'key' | 'permanent' | 'cosmetic';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  price: {
    essence?: number;
    monarchFragments?: number;
  };
  effect: {
    type: string;
    value: number;
    duration?: number;
    stat?: keyof PlayerStats;
  };
  icon: string;
  maxOwned?: number;
  available: boolean;
  requiresLevel?: number;
}

export interface OwnedItem {
  itemId: string;
  quantity: number;
  acquiredAt: string;
}

export interface ActiveBoost {
  itemId: string;
  effect: StoreItem['effect'];
  activatedAt: string;
  expiresAt: string;
}

export const RARITY_COLORS: Record<ItemRarity, { text: string; border: string; bg: string }> = {
  common: { text: 'text-muted-foreground', border: 'border-border', bg: 'bg-muted/20' },
  uncommon: { text: 'text-green-400', border: 'border-green-400/30', bg: 'bg-green-400/10' },
  rare: { text: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/10' },
  epic: { text: 'text-secondary', border: 'border-secondary/30', bg: 'bg-secondary/10' },
  legendary: { text: 'text-amber-400', border: 'border-amber-400/30', bg: 'bg-amber-400/10' },
};
