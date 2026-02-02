import { Lock, Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import { MainQuest } from '@/types/mainQuest';
import { Button } from '@/components/ui/button';

interface MainQuestCardProps {
  quest: MainQuest;
  onComplete: (questId: string) => void;
}

export const MainQuestCard = ({ quest, onComplete }: MainQuestCardProps) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-6 transition-all duration-300 ${
        quest.completed
          ? 'border-primary/50 bg-gradient-to-br from-primary/10 via-card to-secondary/10 glow-primary'
          : 'border-border bg-card/50 opacity-80'
      }`}
    >
      {/* Completed Badge */}
      {quest.completed && (
        <div className="absolute right-4 top-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
      )}

      {/* Locked Icon for Incomplete */}
      {!quest.completed && (
        <div className="absolute right-4 top-4 opacity-30">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      {/* Quest Title */}
      <h3
        className={`font-display text-xl font-bold ${
          quest.completed ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {quest.title}
      </h3>

      {/* Rewards Section */}
      <div className="mt-4 flex flex-wrap gap-4">
        {/* XP Reward */}
        <div className="flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${quest.completed ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`font-tech text-sm ${quest.completed ? 'text-primary' : 'text-muted-foreground'}`}>
            +{quest.xpReward} XP
          </span>
        </div>

        {/* Title Unlock */}
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${quest.completed ? 'text-secondary' : 'text-muted-foreground'}`} />
          <span className={`font-tech text-sm ${quest.completed ? 'text-secondary' : 'text-muted-foreground'}`}>
            Unlocks: {quest.unlocksTitle}
          </span>
        </div>
      </div>

      {/* Completion Date */}
      {quest.completed && quest.completedAt && (
        <p className="mt-3 font-tech text-xs text-muted-foreground">
          Completed: {new Date(quest.completedAt).toLocaleDateString()}
        </p>
      )}

      {/* Complete Button */}
      {!quest.completed && (
        <Button
          onClick={() => onComplete(quest.id)}
          className="mt-4 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50"
        >
          Mark Complete
        </Button>
      )}
    </div>
  );
};
