import { useState } from 'react';
import { Check, Zap, Lock, Shield, Coffee as BreakIcon, HelpCircle } from 'lucide-react';
import { CalibratedQuest } from '@/utils/questCalibration';
import { STAT_LABELS } from '@/types/quest';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';
import { QuestPersuasionData, FramingColor } from '@/hooks/usePersuasion';

interface CalibratedQuestCardProps {
  quest: CalibratedQuest;
  completed: boolean;
  locked?: boolean;
  onToggle: (questId: string) => void;
  animDelay?: number;
  persuasion?: QuestPersuasionData;
  isResistanceQuest?: boolean;
  isPreCommitted?: boolean;
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

function getMessageColorClass(framing: FramingColor): string {
  switch (framing) {
    case 'loss':
      return 'text-red-400/90';
    case 'identity':
      return 'text-foreground/90';
    case 'variable':
      return 'text-yellow-400/90';
    case 'scarcity':
      return 'text-primary/90 animate-persuasion-pulse';
    default:
      return 'text-primary/80';
  }
}

export const CalibratedQuestCard = ({
  quest,
  completed,
  locked,
  onToggle,
  animDelay = 0,
  persuasion,
  isResistanceQuest,
  isPreCommitted,
}: CalibratedQuestCardProps) => {
  const xpModified = quest.adjustedXP !== quest.baseXP;
  const [showReward, setShowReward] = useState(false);
  const [resistanceFlash, setResistanceFlash] = useState(false);

  const hasVariableReward = persuasion?.variableReward?.isActive ?? false;
  const hasMessage = !!persuasion?.message && !completed;

  const handleToggle = () => {
    if (completed) {
      // Uncomplete — no persuasion tracking on undo
      onToggle(quest.id);
      return;
    }

    // Complete
    onToggle(quest.id);

    // Show variable reward reveal
    if (hasVariableReward && persuasion?.variableReward?.revealMessage) {
      setShowReward(true);
      setTimeout(() => setShowReward(false), 4000);
    }

    // Resistance overcome flash
    if (isResistanceQuest) {
      setResistanceFlash(true);
      setTimeout(() => setResistanceFlash(false), 1500);
    }
  };

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

  // Compute border classes
  let borderClass = 'border-border bg-card/50 hover:border-primary/50';
  if (completed) {
    borderClass = 'border-green-500/30 bg-green-500/5';
  } else if (isPreCommitted) {
    borderClass = 'border-2 bg-card/50 hover:border-yellow-500/60';
  } else if (hasVariableReward) {
    borderClass = 'border-yellow-500/30 bg-card/50 hover:border-yellow-500/50 animate-shimmer-border';
  }

  const preCommitStyle = isPreCommitted && !completed
    ? { borderColor: 'hsl(45 100% 50% / 0.4)', boxShadow: '0 0 12px hsl(45 100% 50% / 0.1)' }
    : undefined;

  return (
    <div
      className={`rounded-lg border p-3 transition-all duration-300 animate-fade-in relative overflow-hidden ${borderClass}`}
      style={{ animationDelay: `${animDelay}ms`, ...preCommitStyle }}
    >
      {/* Resistance overcome flash overlay */}
      {resistanceFlash && (
        <div className="absolute inset-0 bg-green-500/15 animate-fade-out pointer-events-none z-10 rounded-lg" />
      )}

      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
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

          {/* XP line */}
          <div className="mt-0.5 flex items-center gap-2 text-xs flex-wrap">
            <span className="text-secondary">{STAT_LABELS[quest.stat]}</span>
            {quest.estimatedMinutes > 0 && (
              <span className="text-muted-foreground">{quest.estimatedMinutes}m</span>
            )}
            {quest.sprintCount > 0 && (
              <span className="text-muted-foreground">{quest.sprintCount} sprint{quest.sprintCount > 1 ? 's' : ''}</span>
            )}
            <span className="text-primary font-semibold inline-flex items-center gap-1">
              +{quest.adjustedXP} XP
              {xpModified && (
                <span className="text-muted-foreground line-through ml-1 font-normal">
                  {quest.baseXP}
                </span>
              )}
              {hasVariableReward && !completed && (
                <HelpCircle className="h-3 w-3 text-yellow-400/70" />
              )}
            </span>
          </div>

          {/* Persuasion message */}
          {hasMessage && persuasion?.message && (
            <p
              className={`mt-1.5 font-mono text-[11px] italic leading-snug ${getMessageColorClass(
                persuasion.framingColor
              )}`}
            >
              {persuasion.message}
            </p>
          )}

          {/* Resistance overcome message */}
          {completed && isResistanceQuest && (
            <p className="mt-1 font-mono text-[10px] text-green-400/80 italic">
              Resistance overcome. The System recalibrates.
            </p>
          )}

          {/* Variable reward reveal */}
          {showReward && persuasion?.variableReward?.revealMessage && (
            <div className="mt-1.5 animate-scale-in">
              <p className="font-mono text-[11px] font-semibold text-yellow-400 text-glow-gold">
                {persuasion.variableReward.revealMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
