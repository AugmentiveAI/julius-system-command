import { useState, useEffect, useCallback } from 'react';
import { useTickerEffect } from '@/contexts/TickerContext';
import { StoreItem, OwnedItem, ActiveBoost } from '@/types/store';
import { STORE_ITEMS } from '@/data/storeItems';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';

const INVENTORY_KEY = 'systemInventoryItems';
const BOOSTS_KEY = 'systemActiveBoosts';

function loadItems(): OwnedItem[] {
  try {
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
  } catch { return []; }
}

function loadBoosts(): ActiveBoost[] {
  try {
    const boosts: ActiveBoost[] = JSON.parse(localStorage.getItem(BOOSTS_KEY) || '[]');
    // Filter expired
    const now = new Date();
    return boosts.filter(b => new Date(b.expiresAt) > now);
  } catch { return []; }
}

export function useStore() {
  const [inventory, setInventory] = useState<OwnedItem[]>(loadItems);
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>(loadBoosts);
  const { essence, monarchFragments, spendCurrency } = useCurrency();
  const { toast } = useToast();

  // Persist
  useEffect(() => {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(BOOSTS_KEY, JSON.stringify(activeBoosts));
  }, [activeBoosts]);

  // Expire boosts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setActiveBoosts(prev => {
        const filtered = prev.filter(b => new Date(b.expiresAt) > now);
        if (filtered.length !== prev.length) {
          localStorage.setItem(BOOSTS_KEY, JSON.stringify(filtered));
        }
        return filtered;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const purchaseItem = useCallback((itemId: string): boolean => {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item || !item.available) return false;

    const owned = inventory.find(i => i.itemId === itemId);
    if (item.maxOwned && owned && owned.quantity >= item.maxOwned) {
      toast({ title: 'Maximum owned', description: `You can only hold ${item.maxOwned} of this item.` });
      return false;
    }

    // Spend currency
    if (item.price.essence) {
      if (!spendCurrency('essence', item.price.essence, 'store_purchase', item.name)) return false;
    }
    if (item.price.monarchFragments) {
      if (!spendCurrency('monarchFragments', item.price.monarchFragments, 'store_purchase', item.name)) return false;
    }

    // Add to inventory
    setInventory(prev => {
      const existing = prev.find(i => i.itemId === itemId);
      if (existing) {
        return prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId, quantity: 1, acquiredAt: new Date().toISOString() }];
    });

    toast({ title: 'Purchase confirmed', description: `${item.icon} ${item.name} added to inventory.` });
    return true;
  }, [inventory, spendCurrency, toast]);

  const useItem = useCallback((itemId: string): boolean => {
    const owned = inventory.find(i => i.itemId === itemId);
    if (!owned || owned.quantity <= 0) return false;

    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    // Apply effect based on type
    if (item.effect.duration) {
      const boost: ActiveBoost = {
        itemId: item.id,
        effect: item.effect,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + item.effect.duration * 60000).toISOString(),
      };
      setActiveBoosts(prev => {
        const updated = [...prev, boost];
        localStorage.setItem(BOOSTS_KEY, JSON.stringify(updated));
        return updated;
      });
      toast({ title: 'Boost activated', description: `${item.icon} ${item.name} active for ${Math.round(item.effect.duration / 60)}h.` });
    }

    // Decrement quantity
    setInventory(prev =>
      prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );

    return true;
  }, [inventory, toast]);

  const getOwnedQuantity = useCallback((itemId: string): number => {
    return inventory.find(i => i.itemId === itemId)?.quantity || 0;
  }, [inventory]);

  const hasKey = useCallback((keyType: 'dungeon_key' | 'boss_key' | 's_rank_key'): boolean => {
    const map: Record<string, string> = {
      dungeon_key: 'instant_dungeon_key',
      boss_key: 'boss_key',
      s_rank_key: 's_rank_key',
    };
    return getOwnedQuantity(map[keyType]) > 0;
  }, [getOwnedQuantity]);

  const useKey = useCallback((keyType: 'dungeon_key' | 'boss_key' | 's_rank_key'): boolean => {
    const map: Record<string, string> = {
      dungeon_key: 'instant_dungeon_key',
      boss_key: 'boss_key',
      s_rank_key: 's_rank_key',
    };
    return useItem(map[keyType]);
  }, [useItem]);

  const getActiveBoostMultiplier = useCallback((type: 'xp' | 'essence'): number => {
    let multiplier = 1;
    for (const boost of activeBoosts) {
      if (boost.effect.type === 'xp_boost' && type === 'xp') multiplier += boost.effect.value;
      if (boost.effect.type === 'essence_boost' && type === 'essence') multiplier += boost.effect.value;
      if (boost.effect.type === 'double_rewards') multiplier += boost.effect.value;
    }
    return multiplier;
  }, [activeBoosts]);

  const canAffordItem = useCallback((itemId: string): boolean => {
    const item = STORE_ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    if (item.price.essence && essence < item.price.essence) return false;
    if (item.price.monarchFragments && monarchFragments < item.price.monarchFragments) return false;
    return true;
  }, [essence, monarchFragments]);

  return {
    inventory,
    activeBoosts,
    storeItems: STORE_ITEMS.filter(i => i.available),
    purchaseItem,
    useItem,
    getOwnedQuantity,
    hasKey,
    useKey,
    getActiveBoostMultiplier,
    canAffordItem,
  };
}
