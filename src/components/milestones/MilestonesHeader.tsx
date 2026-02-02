import { Target } from 'lucide-react';

interface MilestonesHeaderProps {
  completedCount: number;
  totalCount: number;
}

export const MilestonesHeader = ({ completedCount, totalCount }: MilestonesHeaderProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-secondary" />
          <h2 className="font-display text-xl font-bold text-foreground">
            Main Quests
          </h2>
        </div>
        
        <div className="font-tech text-sm">
          <span className="text-secondary">{completedCount}</span>
          <span className="text-muted-foreground">/{totalCount} Complete</span>
        </div>
      </div>
      
      <p className="mt-2 font-tech text-xs text-muted-foreground">
        Long-term milestones that define your journey. Complete these to unlock new ranks.
      </p>
    </div>
  );
};
