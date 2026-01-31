import { Check } from 'lucide-react';
import { Quest } from '@/types/quest';
import { STAT_LABELS } from '@/types/quest';

interface QuestCardProps {
  quest: Quest;
  onToggle: (questId: string) => void;
}

export const QuestCard = ({ quest, onToggle }: QuestCardProps) => {
  const { id, title, stat, xpReward, completed } = quest;

  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 ${
        completed
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border bg-card hover:border-primary/50'
      }`}
      style={
        completed
          ? { boxShadow: '0 0 15px hsl(142 76% 36% / 0.2)' }
          : undefined
      }
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(id)}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
            completed
              ? 'border-green-500 bg-green-500'
              : 'border-muted-foreground hover:border-primary'
          }`}
        >
          {completed && <Check className="h-4 w-4 text-white" />}
        </button>

        {/* Quest Info */}
        <div className="flex-1">
          <h3
            className={`font-tech text-lg font-semibold transition-colors ${
              completed ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}
          >
            {title}
          </h3>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-tech text-sm text-secondary">
              {STAT_LABELS[stat]}
            </span>
            <span className="font-display text-sm font-bold text-primary">
              +{xpReward} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
