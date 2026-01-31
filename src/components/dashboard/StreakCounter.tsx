import { Zap } from 'lucide-react';

interface StreakCounterProps {
  streak: number;
}

export const StreakCounter = ({ streak }: StreakCounterProps) => {
  const isActive = streak > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-center gap-4">
        <Zap
          className={`h-10 w-10 ${
            isActive ? 'text-secondary animate-pulse' : 'text-muted-foreground'
          }`}
          fill={isActive ? 'currentColor' : 'none'}
          style={
            isActive
              ? { filter: 'drop-shadow(0 0 8px hsl(263 91% 66% / 0.7))' }
              : undefined
          }
        />
        <div className="text-center">
          <div
            className={`font-display text-5xl font-bold ${
              isActive
                ? 'text-secondary text-glow-secondary'
                : 'text-muted-foreground'
            }`}
          >
            {streak}
          </div>
          <div className="font-tech text-lg uppercase tracking-wider text-muted-foreground">
            Day Streak
          </div>
        </div>
      </div>

      {streak === 0 && (
        <p className="mt-4 text-center font-tech text-sm text-muted-foreground">
          Complete daily quests to build your streak.
        </p>
      )}
    </div>
  );
};
