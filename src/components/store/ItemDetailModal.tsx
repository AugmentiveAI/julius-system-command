import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StoreItem, RARITY_COLORS } from '@/types/store';
import { Gem, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ItemDetailModalProps {
  item: StoreItem | null;
  owned: number;
  canAfford: boolean;
  open: boolean;
  onClose: () => void;
  onPurchase: () => void;
  onUse?: () => void;
}

export function ItemDetailModal({ item, owned, canAfford, open, onClose, onPurchase, onUse }: ItemDetailModalProps) {
  if (!item) return null;
  const rarity = RARITY_COLORS[item.rarity];
  const atMax = item.maxOwned !== undefined && owned >= item.maxOwned;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-4xl">{item.icon}</span>
            <div>
              <h2 className={`font-tech text-lg font-bold ${rarity.text}`}>{item.name}</h2>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${rarity.text}`}>{item.rarity}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground pt-2">
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Effect details */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
            <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">Effect</p>
            <p className="font-tech text-sm text-foreground">
              {item.effect.type.replace(/_/g, ' ').toUpperCase()}: {item.effect.value > 1 ? `+${item.effect.value}` : `+${Math.round(item.effect.value * 100)}%`}
              {item.effect.stat && ` ${item.effect.stat}`}
            </p>
            {item.effect.duration && (
              <p className="font-mono text-[10px] text-muted-foreground">
                Duration: {item.effect.duration >= 60 ? `${Math.round(item.effect.duration / 60)}h` : `${item.effect.duration}m`}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.price.essence && (
                <div className="flex items-center gap-1">
                  <Gem className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-bold text-primary">{item.price.essence}</span>
                </div>
              )}
              {item.price.monarchFragments && (
                <div className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-secondary" />
                  <span className="font-mono text-sm font-bold text-secondary">{item.price.monarchFragments}</span>
                </div>
              )}
            </div>
            {owned > 0 && (
              <span className="font-mono text-xs text-muted-foreground">Owned: {owned}{item.maxOwned ? `/${item.maxOwned}` : ''}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={onPurchase}
              disabled={!canAfford || atMax}
              className="flex-1 font-mono text-xs"
            >
              {atMax ? 'MAX OWNED' : canAfford ? 'PURCHASE' : 'INSUFFICIENT FUNDS'}
            </Button>
            {owned > 0 && onUse && (
              <Button
                variant="outline"
                onClick={onUse}
                className="font-mono text-xs"
              >
                USE
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
