import { useState, useCallback, useMemo } from 'react';
import { Brain, Zap, Target, ChevronRight } from 'lucide-react';
import { PILLAR_CONFIG, Pillar, PillarQuest } from '@/types/pillarQuests';

interface PillarConfirmationProps {
  quests: PillarQuest[];
  onConfirm: () => void;
}

export const PillarConfirmation = ({ quests, onConfirm }: PillarConfirmationProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setTimeout(onConfirm, 600);
  }, [onConfirm]);

  if (confirmed) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-card/80 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Confirm Today's Pillars
        </p>
        <span className="font-mono text-[10px] text-primary">Required</span>
      </div>

      <div className="flex gap-2">
        {quests.map(quest => {
          const cfg = PILLAR_CONFIG[quest.pillar];
          const Icon = quest.pillar === 'mind' ? Brain : quest.pillar === 'body' ? Zap : Target;
          return (
            <div
              key={quest.id}
              className={`flex-1 rounded-lg border p-3 text-center ${cfg.glowClass} bg-card/50`}
            >
              <Icon className={`h-5 w-5 mx-auto ${cfg.color}`} />
              <p className="font-mono text-[10px] text-foreground mt-1.5 font-semibold truncate">
                {quest.title}
              </p>
              <p className={`font-mono text-[9px] mt-0.5 ${cfg.color}`}>
                {cfg.label}
              </p>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-primary/50 bg-primary/10 font-mono text-xs tracking-[0.1em] font-semibold text-primary transition-all hover:bg-primary/20"
        style={{ boxShadow: '0 0 15px hsl(187 100% 50% / 0.15)' }}
      >
        CONFIRM PILLARS
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
