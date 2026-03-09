import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Gem, Crown } from 'lucide-react';

export function CurrencyDisplay() {
  const { essence, monarchFragments, getRecentTransactions } = useCurrency();
  const recent = getRecentTransactions(8);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-1">
            <Gem className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-xs font-bold text-primary">{essence}</span>
          </div>
          {monarchFragments > 0 && (
            <div className="flex items-center gap-1">
              <Crown className="h-3.5 w-3.5 text-secondary" />
              <span className="font-mono text-xs font-bold text-secondary">{monarchFragments}</span>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 text-xs">
        <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
          Currency
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="h-4 w-4 text-primary" />
              <span className="font-tech text-sm text-foreground">Essence</span>
            </div>
            <span className="font-mono text-sm font-bold text-primary">{essence}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-secondary" />
              <span className="font-tech text-sm text-foreground">Monarch Fragments</span>
            </div>
            <span className="font-mono text-sm font-bold text-secondary">{monarchFragments}</span>
          </div>
        </div>
        {recent.length > 0 && (
          <>
            <div className="border-t border-border pt-2">
              <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Recent
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recent.map(txn => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[160px]">
                      {txn.description}
                    </span>
                    <span className={`font-mono text-[10px] font-bold ${txn.type === 'earn' ? 'text-green-400' : 'text-destructive'}`}>
                      {txn.type === 'earn' ? '+' : '-'}{txn.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
