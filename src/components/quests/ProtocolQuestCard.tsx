import { Check, Zap } from 'lucide-react';
import { hapticTap } from '@/utils/haptics';
import { ProtocolQuest } from '@/types/quests';
import { STAT_LABELS } from '@/types/quest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProtocolQuestCardProps {
  quest: ProtocolQuest;
  onToggle: (questId: string) => void;
}

export const ProtocolQuestCard = ({ quest, onToggle }: ProtocolQuestCardProps) => {
  const { id, title, stat, xp, completed, geneticBonus } = quest;
  const totalXp = xp + (geneticBonus?.bonusXp || 0);

  return (
    <div
      className={`rounded-lg border p-3 transition-all duration-300 ${
        completed
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border bg-card/50 hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onTouchStart={hapticTap}
          onClick={() => onToggle(id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
            completed
              ? 'border-green-500 bg-green-500'
              : 'border-muted-foreground hover:border-primary'
          }`}
        >
          {completed && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Quest Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-tech text-sm font-medium transition-colors ${
                completed ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}
            >
              {title}
            </h3>
            {geneticBonus && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center text-green-400">
                      <Zap className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">
                      <span className="text-green-400">+{geneticBonus.bonusXp} XP</span>
                      {' '}— {geneticBonus.reason}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className="text-secondary">{STAT_LABELS[stat]}</span>
            <span className="text-primary font-semibold">
              +{totalXp} XP
              {geneticBonus && (
                <span className="text-green-400 ml-1">
                  ({xp}+{geneticBonus.bonusXp})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
