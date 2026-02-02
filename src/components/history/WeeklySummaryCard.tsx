import { TrendingUp, CheckCircle2, Calendar, Flame } from 'lucide-react';
import { WeeklySummary } from '@/types/history';

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  currentStreak: number;
}

export const WeeklySummaryCard = ({ summary, currentStreak }: WeeklySummaryCardProps) => {
  const startDate = new Date(summary.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endDate = new Date(summary.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-foreground">
          Weekly Summary
        </h2>
        <span className="font-tech text-xs text-muted-foreground">
          {startDate} - {endDate}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total XP */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-primary">
              +{summary.totalXP}
            </p>
            <p className="font-tech text-xs text-muted-foreground">XP Earned</p>
          </div>
        </div>

        {/* Quests Completed */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-secondary">
              {summary.questsCompleted}
            </p>
            <p className="font-tech text-xs text-muted-foreground">Quests</p>
          </div>
        </div>

        {/* Days Active */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-foreground">
              {summary.daysActive}/7
            </p>
            <p className="font-tech text-xs text-muted-foreground">Days Active</p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
            <Flame className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-display text-xl font-bold text-destructive">
              {currentStreak}
            </p>
            <p className="font-tech text-xs text-muted-foreground">Day Streak</p>
          </div>
        </div>
      </div>
    </div>
  );
};
