import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { useStore } from '@/hooks/useStore';
import { CurrencyDisplay } from '@/components/dashboard/CurrencyDisplay';
import { StoreItemCard } from '@/components/store/StoreItemCard';
import { ItemDetailModal } from '@/components/store/ItemDetailModal';
import { ActiveBoostsBar } from '@/components/dashboard/ActiveBoostsBar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { StoreItem, ItemCategory } from '@/types/store';
import { STORE_ITEMS } from '@/data/storeItems';
import { Backpack } from 'lucide-react';

type FilterCategory = 'all' | ItemCategory;

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'ALL',
  consumable: 'POTIONS',
  boost: 'BOOSTS',
  key: 'KEYS',
  permanent: 'PERMANENT',
  cosmetic: 'COSMETIC',
};

const Store = () => {
  const { essence, monarchFragments } = useCurrency();
  const { storeItems, purchaseItem, useItem, canAffordItem, getOwnedQuantity, inventory } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [detailItem, setDetailItem] = useState<StoreItem | null>(null);

  const categories: FilterCategory[] = ['all', 'consumable', 'boost', 'key'];
  const filteredItems = selectedCategory === 'all'
    ? storeItems
    : storeItems.filter(i => i.category === selectedCategory);

  const totalOwned = inventory.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            System Store
          </h1>
          <CurrencyDisplay />
        </div>

        {/* Active boosts */}
        <ActiveBoostsBar />

        {/* Inventory count */}
        {totalOwned > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
            <Backpack className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">
              {totalOwned} item{totalOwned !== 1 ? 's' : ''} in inventory
            </span>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-md px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'border border-border text-muted-foreground hover:border-primary/20 hover:text-foreground'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map(item => (
            <StoreItemCard
              key={item.id}
              item={item}
              owned={getOwnedQuantity(item.id)}
              canAfford={canAffordItem(item.id)}
              onPurchase={() => purchaseItem(item.id)}
              onTap={() => setDetailItem(item)}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
            <p className="font-mono text-xs text-muted-foreground">No items in this category.</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <ItemDetailModal
        item={detailItem}
        owned={detailItem ? getOwnedQuantity(detailItem.id) : 0}
        canAfford={detailItem ? canAffordItem(detailItem.id) : false}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        onPurchase={() => {
          if (detailItem) purchaseItem(detailItem.id);
        }}
        onUse={detailItem && getOwnedQuantity(detailItem.id) > 0 ? () => {
          if (detailItem) useItem(detailItem.id);
        } : undefined}
      />

      <BottomNav />
    </div>
  );
};

export default Store;
