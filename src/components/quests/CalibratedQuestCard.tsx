import { Check, Zap, Lock, Shield, Coffee as BreakIcon } from 'lucide-react';
import { CalibratedQuest } from '@/utils/questCalibration';
import { STAT_LABELS } from '@/types/quest';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';

interface CalibratedQuestCardProps {
  quest: CalibratedQuest;
  completed: boolean;
  locked?: boolean;
  onToggle: (questId: string) => void;
  animDelay?: number;
}

const DifficultyBadge = ({ difficulty }: { difficulty: QuestDifficulty }) => {
  const config = DIFFICULTY_BADGE_CONFIG[difficulty];
  return (
    <span
      className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-mono font-bold border shrink-0 ${config.className}`}
      style={config.glow ? { boxShadow: config.glow } : undefined}
    >
      {config.label}
    </span>
  );
};

export const CalibratedQuestCard = ({
  quest,
  completed,
  locked,
  onToggle,
  animDelay = 0,
}: CalibratedQuestCardProps) => {
  const xpModified = quest.adjustedXP !== quest.baseXP;

  if (locked) {
    return (
      <div
        className="rounded-lg border border-border/30 bg-card/20 p-3 opacity-40 relative overflow-hidden"
        style={{ animationDelay: `${animDelay}ms` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-muted-foreground/30">
            <Lock className="h-3 w-3 text-muted-foreground/50" />
          </div>
          <div className="flex-1">
            <div className="h-3 w-3/4 bg-muted-foreground/20 rounded" />
            <div className="h-2 w-1/2 bg-muted-foreground/10 rounded mt-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 transition-all duration-300 animate-fade-in ${
        completed
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border bg-card/50 hover:border-primary/50'
      }`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(quest.id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
            completed
              ? 'border-green-500 bg-green-500'
              : 'border-muted-foreground hover:border-primary'
          }`}
        >
          {completed && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Difficulty Badge */}
        <DifficultyBadge difficulty={quest.difficulty} />

        {/* Quest Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-tech text-sm font-medium transition-colors ${
                completed ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}
            >
              {quest.title}
            </h3>
            {quest.isBonus && (
              <Zap className="h-3 w-3 text-yellow-400 shrink-0" />
            )}
            {quest.isMandatory && (
              <Shield className="h-3 w-3 text-red-400 shrink-0" />
            )}
            {quest.isBreak && (
              <BreakIcon className="h-3 w-3 text-blue-400 shrink-0" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-secondary">{STAT_LABELS[quest.stat]}</span>
            {quest.estimatedMinutes > 0 && (
              <span className="text-muted-foreground">{quest.estimatedMinutes}m</span>
            )}
            {quest.sprintCount > 0 && (
              <span className="text-muted-foreground">{quest.sprintCount} sprint{quest.sprintCount > 1 ? 's' : ''}</span>
            )}
            <span className="text-primary font-semibold">
              +{quest.adjustedXP} XP
              {xpModified && (
                <span className="text-muted-foreground line-through ml-1 font-normal">
                  {quest.baseXP}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
