import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { STORE_ITEMS } from '@/data/storeItems';
import { Zap } from 'lucide-react';

export function ActiveBoostsBar() {
  const { activeBoosts } = useStore();
  const [, setTick] = useState(0);

  // Force re-render every 30s for countdown
  useEffect(() => {
    if (activeBoosts.length === 0) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [activeBoosts.length]);

  if (activeBoosts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto">
      <Zap className="h-3 w-3 text-primary shrink-0" />
      {activeBoosts.map((boost, i) => {
        const item = STORE_ITEMS.find(s => s.id === boost.itemId);
        const remaining = Math.max(0, new Date(boost.expiresAt).getTime() - Date.now());
        const mins = Math.floor(remaining / 60000);
        const hrs = Math.floor(mins / 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;

        return (
          <div
            key={i}
            className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 shrink-0"
          >
            <span className="text-xs">{item?.icon || '⚡'}</span>
            <span className="font-mono text-[9px] text-primary">{item?.name?.split(' ')[0]}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
}
