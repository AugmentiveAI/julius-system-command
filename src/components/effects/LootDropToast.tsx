import { useState, useEffect } from 'react';
import { LootItem, RARITY_CONFIG } from '@/types/loot';

interface LootDropToastProps {
  item: LootItem | null;
  show: boolean;
  onDone: () => void;
}

/**
 * Rich toast for Common/Uncommon drops — slides in, shows item, fades out.
 */
export const LootDropToast = ({ item, show, onDone }: LootDropToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && item) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 400);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, item, onDone]);

  if (!item || !visible) return null;

  const config = RARITY_CONFIG[item.rarity];
  const categoryIcon = getCategoryIcon(item.category);

  return (
    <div
      className="fixed bottom-24 left-4 right-4 z-40 pointer-events-none flex justify-center"
      style={{ animation: visible ? 'loot-toast-in 0.4s ease-out forwards' : 'loot-toast-out 0.4s ease-in forwards' }}
    >
      <div
        className={`max-w-sm w-full rounded-lg border ${config.borderClass} ${config.bgClass} bg-card/95 backdrop-blur-sm p-3 shadow-lg`}
        style={{
          boxShadow: config.glowIntensity > 0
            ? `0 0 ${20 * config.glowIntensity}px hsl(${config.color} / ${0.3 * config.glowIntensity})`
            : undefined,
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{categoryIcon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`font-display text-xs uppercase tracking-widest ${config.textClass}`}>
                {config.label}
              </span>
            </div>
            <p className={`font-display text-sm font-bold ${config.textClass}`}>
              {item.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loot-toast-in {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes loot-toast-out {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'tactical_insight': return '📜';
    case 'system_upgrade': return '⚙️';
    case 'template': return '📋';
    case 'stat_bonus': return '⚡';
    case 'title': return '👑';
    default: return '🎁';
  }
}
