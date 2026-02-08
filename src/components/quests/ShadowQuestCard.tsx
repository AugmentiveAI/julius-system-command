import { useState } from 'react';
import { Check, Clock, Skull, Sparkles, Trophy } from 'lucide-react';
import { ShadowQuest } from '@/utils/shadowQuests';

interface ShadowQuestCardProps {
  quest: ShadowQuest;
  timeRemaining: { minutes: number; seconds: number } | null;
  onComplete: () => void;
}

export const ShadowQuestCard = ({ quest, timeRemaining, onComplete }: ShadowQuestCardProps) => {
  const [showRewardReveal, setShowRewardReveal] = useState(false);
  const [completed, setCompleted] = useState(quest.completed);

  const handleComplete = () => {
    if (completed || quest.expired) return;
    setCompleted(true);
    onComplete();

    // Show reward animation
    setShowRewardReveal(true);
    setTimeout(() => setShowRewardReveal(false), 5000);
  };

  const isExpired = quest.expired || (timeRemaining === null && !completed);

  return (
    <div className="animate-fade-in">
      <div
        className={`relative rounded-lg border-2 p-4 overflow-hidden transition-all duration-500 ${
          completed
            ? 'border-secondary/50 bg-secondary/10'
            : isExpired
              ? 'border-border/30 bg-card/20 opacity-50'
              : 'border-secondary/40 shadow-quest-card'
        }`}
        style={
          !completed && !isExpired
            ? { boxShadow: '0 0 20px hsl(263 91% 66% / 0.2), inset 0 0 20px hsl(263 91% 10% / 0.3)' }
            : undefined
        }
      >
        {/* Particle overlay for active quests */}
        {!completed && !isExpired && (
          <div className="absolute inset-0 pointer-events-none shadow-particles" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-2">
            <Skull className="h-4 w-4 text-secondary" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-secondary/80 uppercase">
              Shadow Quest
            </span>
          </div>
          {!completed && !isExpired && timeRemaining && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs tabular-nums">
                {timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
          {completed && (
            <div className="flex items-center gap-1 text-secondary">
              <Trophy className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] tracking-wider">CONQUERED</span>
            </div>
          )}
        </div>

        {/* Quest content */}
        <div className="flex items-start gap-3 relative z-10">
          <button
            onClick={handleComplete}
            disabled={completed || isExpired}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-all ${
              completed
                ? 'border-secondary bg-secondary'
                : isExpired
                  ? 'border-muted-foreground/30 cursor-not-allowed'
                  : 'border-secondary/60 hover:border-secondary hover:shadow-[0_0_8px_hsl(263_91%_66%/0.4)]'
            }`}
          >
            {completed && <Check className="h-4 w-4 text-secondary-foreground" />}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className={`font-display text-sm font-bold ${
              completed ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}>
              {quest.title}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground leading-relaxed">
              {quest.description}
            </p>

            {/* Condition */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-mono text-secondary/70 italic">{quest.condition}</span>
            </div>

            {/* XP */}
            {quest.rewardXP > 0 && (
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-tech text-sm font-semibold text-secondary">
                  +{quest.rewardXP} XP
                </span>
                {quest.variableReward.isActive && !completed && (
                  <Sparkles className="h-3 w-3 text-yellow-400/70 animate-persuasion-pulse" />
                )}
                {quest.extraReward && (
                  <span className="font-mono text-[10px] text-yellow-400/80 border border-yellow-400/20 px-1.5 py-0.5 rounded">
                    {quest.extraReward}
                  </span>
                )}
              </div>
            )}

            {/* Expired message */}
            {isExpired && !completed && (
              <p className="mt-2 font-mono text-[11px] text-muted-foreground/60 italic">
                The shadow fades. Opportunity lost. It will return… when you least expect it.
              </p>
            )}
          </div>
        </div>

        {/* Reward reveal animation */}
        {showRewardReveal && (
          <div className="mt-3 relative z-10 animate-scale-in">
            <div className="rounded-md bg-secondary/10 border border-secondary/30 p-3 text-center space-y-1">
              <p className="font-mono text-sm font-bold text-secondary text-glow-secondary">
                {quest.rewardMessage}
              </p>
              {quest.variableReward.isActive && quest.variableReward.revealMessage && (
                <p className="font-mono text-xs text-yellow-400 text-glow-gold">
                  {quest.variableReward.revealMessage}
                </p>
              )}
              {quest.extraReward && (
                <p className="font-mono text-[10px] text-yellow-400/80 tracking-wider">
                  TITLE UNLOCKED: {quest.extraReward}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
