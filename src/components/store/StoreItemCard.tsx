import { StoreItem, RARITY_COLORS } from '@/types/store';
import { Gem, Crown, Lock } from 'lucide-react';

interface StoreItemCardProps {
  item: StoreItem;
  owned: number;
  canAfford: boolean;
  onPurchase: () => void;
  onTap?: () => void;
}

export function StoreItemCard({ item, owned, canAfford, onPurchase, onTap }: StoreItemCardProps) {
  const rarity = RARITY_COLORS[item.rarity];
  const atMax = item.maxOwned !== undefined && owned >= item.maxOwned;

  return (
    <button
      onClick={onTap}
      className={`flex flex-col rounded-lg border p-3 text-left transition-all ${rarity.border} ${rarity.bg} hover:brightness-110`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{item.icon}</span>
        {owned > 0 && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
            ×{owned}
          </span>
        )}
      </div>

      <h3 className={`font-tech text-sm font-semibold ${rarity.text}`}>{item.name}</h3>
      <p className="font-mono text-[9px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>

      <div className="flex items-center justify-between mt-auto pt-3">
        <div className="flex items-center gap-1">
          {item.price.essence && (
            <div className="flex items-center gap-0.5">
              <Gem className="h-3 w-3 text-primary" />
              <span className="font-mono text-[10px] text-primary">{item.price.essence}</span>
            </div>
          )}
          {item.price.monarchFragments && (
            <div className="flex items-center gap-0.5">
              <Crown className="h-3 w-3 text-secondary" />
              <span className="font-mono text-[10px] text-secondary">{item.price.monarchFragments}</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onPurchase(); }}
          disabled={!canAfford || atMax}
          className={`rounded-md px-3 py-1 font-mono text-[10px] font-bold transition-all ${
            atMax
              ? 'border border-muted text-muted-foreground cursor-not-allowed'
              : canAfford
                ? 'border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border border-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {atMax ? 'MAX' : canAfford ? 'BUY' : <Lock className="h-3 w-3 inline" />}
        </button>
      </div>

      <span className={`mt-1 font-mono text-[8px] uppercase tracking-wider ${rarity.text}`}>
        {item.rarity}
      </span>
    </button>
  );
}
