import { Link } from 'react-router-dom';
import { Snowflake, Dumbbell, Pill, Coffee, Check, X, ChevronRight } from 'lucide-react';
import { ProtocolQuest, QuestTimeBlock, TIME_BLOCK_CONFIG } from '@/types/quests';
import { Workout } from '@/types/training';
import { Progress } from '@/components/ui/progress';

interface QuickActionsProps {
  quests: ProtocolQuest[];
  workout: Workout;
  workoutCompleted: boolean;
  hasLoggedAfter10am: boolean;
  caffeineLogCount: number;
  getTimeBlockStats: (tb: QuestTimeBlock) => { completed: number; total: number };
}

const STATUS_ICON_DONE = <Check className="h-3.5 w-3.5 text-green-400" />;
const STATUS_ICON_FAIL = <X className="h-3.5 w-3.5 text-destructive" />;

export const QuickActions = ({
  quests,
  workout,
  workoutCompleted,
  hasLoggedAfter10am,
  caffeineLogCount,
  getTimeBlockStats,
}: QuickActionsProps) => {
  const coldQuest = quests.find(q => q.id === 'cold-exposure');
  const supplementIds = ['morning-supplements', 'midday-supplements', 'evening-supplements'];
  const supplementsDone = supplementIds.filter(id => quests.find(q => q.id === id)?.completed).length;

  const timeBlocks: QuestTimeBlock[] = ['morning', 'midday', 'afternoon', 'evening'];

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {/* Cold Exposure */}
          <div className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${
            coldQuest?.completed
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border bg-muted/30'
          }`}>
            <Snowflake className={`h-4 w-4 shrink-0 ${coldQuest?.completed ? 'text-green-400' : 'text-blue-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="font-tech text-xs text-foreground truncate">Cold Exposure</p>
              <p className="font-tech text-[10px] text-muted-foreground">
                {coldQuest?.completed ? 'Completed ✓' : 'Not started'}
              </p>
            </div>
          </div>

          {/* Today's Workout */}
          <Link
            to="/training"
            className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors ${
              workoutCompleted
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-border bg-muted/30 hover:border-primary/50'
            }`}
          >
            <Dumbbell className={`h-4 w-4 shrink-0 ${workoutCompleted ? 'text-green-400' : 'text-orange-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="font-tech text-xs text-foreground truncate">{workout.label}</p>
              <p className="font-tech text-[10px] text-muted-foreground">
                {workoutCompleted ? 'Done ✓' : 'Tap to start'}
              </p>
            </div>
            {!workoutCompleted && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          </Link>

          {/* Supplements */}
          <div className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${
            supplementsDone === 3
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-border bg-muted/30'
          }`}>
            <Pill className={`h-4 w-4 shrink-0 ${supplementsDone === 3 ? 'text-green-400' : 'text-purple-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="font-tech text-xs text-foreground truncate">Supplements</p>
              <p className="font-tech text-[10px] text-muted-foreground">
                {supplementsDone}/3 stacks
              </p>
            </div>
          </div>

          {/* Caffeine Status */}
          <div className={`flex items-center gap-2 rounded-md border p-2.5 text-sm ${
            hasLoggedAfter10am
              ? 'border-destructive/30 bg-destructive/10'
              : caffeineLogCount > 0
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-border bg-muted/30'
          }`}>
            <Coffee className={`h-4 w-4 shrink-0 ${
              hasLoggedAfter10am ? 'text-destructive' : caffeineLogCount > 0 ? 'text-green-400' : 'text-muted-foreground'
            }`} />
            <div className="min-w-0 flex-1">
              <p className="font-tech text-xs text-foreground truncate">Caffeine</p>
              <p className="font-tech text-[10px] text-muted-foreground">
                {hasLoggedAfter10am ? 'Debuff active' : caffeineLogCount > 0 ? `${caffeineLogCount} logged ✓` : 'None today'}
              </p>
            </div>
            {hasLoggedAfter10am && STATUS_ICON_FAIL}
          </div>
        </div>
      </div>

      {/* Time Block Progress */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Protocol Progress
        </h2>
        <div className="space-y-2.5">
          {timeBlocks.map(tb => {
            const config = TIME_BLOCK_CONFIG[tb];
            const { completed, total } = getTimeBlockStats(tb);
            const pct = total > 0 ? (completed / total) * 100 : 0;

            return (
              <div key={tb} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-tech text-xs ${config.color}`}>{config.label}</span>
                  <span className="font-tech text-[10px] text-muted-foreground">
                    {completed}/{total}
                  </span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
