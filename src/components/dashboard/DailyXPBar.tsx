import { DailyXPBreakdown } from '@/types/xp';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';

interface DailyXPBarProps {
  breakdown: DailyXPBreakdown;
}

export const DailyXPBar = ({ breakdown }: DailyXPBarProps) => {
  const percentage = Math.min((breakdown.total / breakdown.max) * 100, 100);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-tech text-sm text-muted-foreground">Daily XP</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help font-tech text-sm text-primary underline decoration-dotted">
                {breakdown.total} / {breakdown.max} XP
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-56">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quests</span>
                  <span className="font-mono">{breakdown.quests} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Training</span>
                  <span className="font-mono">{breakdown.training} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Genetic Bonuses</span>
                  <span className="font-mono text-secondary">+{breakdown.geneticBonuses} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cold Streak</span>
                  <span className="font-mono text-secondary">+{breakdown.streakBonus} XP</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{breakdown.total} XP</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Progress value={percentage} className="h-3" />
    </div>
  );
};
