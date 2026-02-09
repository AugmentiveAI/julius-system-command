import { useState } from 'react';
import { useGeneticState } from '@/hooks/useGeneticState';
import { COMTPhase } from '@/utils/geneticEngine';
import { getDayNumber } from '@/hooks/useSystemStrategy';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const MODE_CONFIG: Record<string, { dot: string; label: string }> = {
  push: { dot: 'bg-green-400 shadow-[0_0_8px_hsl(142_76%_36%/0.6)]', label: 'PUSH' },
  steady: { dot: 'bg-amber-400 shadow-[0_0_8px_hsl(38_92%_50%/0.6)]', label: 'STEADY' },
  recover: { dot: 'bg-red-400 shadow-[0_0_8px_hsl(0_84%_60%/0.6)]', label: 'RECOVERY' },
};

const COMT_LABELS: Record<COMTPhase, string> = {
  peak: '🟢 Warrior Peak — dopamine high, max output window',
  stable: '🔵 Stable — normal capacity',
  dip: '🟡 Dip — reduced dopamine, expect lower focus',
  recovery: '⚪ Recovering — conserve energy',
};

interface TopBarProps {
  systemRecommendation: 'push' | 'steady' | 'recover';
}

export const TopBar = ({ systemRecommendation }: TopBarProps) => {
  const { geneticState, sprintsToday } = useGeneticState();
  const dayNumber = getDayNumber();
  const mode = MODE_CONFIG[systemRecommendation] || MODE_CONFIG.steady;

  return (
    <div className="flex items-center justify-between px-4 py-2">
      {/* Left: Mode */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
            <div className={`h-2.5 w-2.5 rounded-full ${mode.dot}`} />
            <span className="font-mono text-xs font-bold tracking-wider text-foreground">
              {mode.label}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3 text-xs">
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
            System Status
          </p>
          <div className="space-y-2">
            <div>
              <span className="font-bold text-foreground">COMT Phase</span>
              <p className="text-muted-foreground">{COMT_LABELS[geneticState.comtPhase]}</p>
            </div>
            {geneticState.activeBuffs.length > 0 && (
              <div>
                <span className="font-bold text-green-400">Active Buffs</span>
                {geneticState.activeBuffs.map((b, i) => (
                  <p key={i} className="text-muted-foreground">{b.icon} {b.name}: {b.effect}</p>
                ))}
              </div>
            )}
            {geneticState.activeDebuffs.length > 0 && (
              <div>
                <span className="font-bold text-red-400">Active Debuffs</span>
                {geneticState.activeDebuffs.map((d, i) => (
                  <p key={i} className="text-muted-foreground">{d.icon} {d.name}: {d.effect}</p>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Right: Sprint counter + Day */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs font-bold text-foreground transition-colors hover:bg-muted/50">
              ⚡ {Math.min(sprintsToday, 4)}/4
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-2 text-xs">
            <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
              Sprint Counter
            </p>
            <p className="text-muted-foreground">
              ACTN3 sprinter gene: optimal in bursts of ≤45 min. Diminishing returns after 4 sprints.
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i <= sprintsToday
                      ? i <= 2 ? 'bg-green-400' : i === 3 ? 'bg-amber-400' : 'bg-red-400'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <span className="font-mono text-xs text-muted-foreground">
          Day {dayNumber}
        </span>
      </div>
    </div>
  );
};
