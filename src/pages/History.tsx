import { BookOpen } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { WeeklySummaryCard } from '@/components/history/WeeklySummaryCard';
import { DayGroup } from '@/components/history/DayGroup';
import { useHistory } from '@/hooks/useHistory';
import { usePlayer } from '@/hooks/usePlayer';
import { GeneticHUD } from '@/components/genetic/GeneticHUD';

const History = () => {
  const { daysSummary, weeklySummary } = useHistory();
  const { player } = usePlayer();

  return (
    <div className="min-h-screen bg-background pb-24 pt-6">
      <GeneticHUD />
      <div className="mx-auto max-w-2xl space-y-4 px-4 mt-3">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
        </div>

        {/* Page Header */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-center gap-2">
            <BookOpen className="h-5 w-5 text-secondary" />
            <h2 className="font-display text-xl font-bold text-foreground">
              Quest Log
            </h2>
          </div>
          <p className="mt-1 font-tech text-xs text-muted-foreground text-center">
            A record of your completed quests and achievements.
          </p>
        </div>

        {/* Weekly Summary */}
        <WeeklySummaryCard summary={weeklySummary} currentStreak={player.streak} />

        {/* Quest Log */}
        <div className="space-y-4">
          {daysSummary.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/50 p-8 text-center">
              <p className="font-tech text-sm text-muted-foreground">
                No quests completed yet. Your journey awaits.
              </p>
            </div>
          ) : (
            daysSummary.map(day => (
              <DayGroup key={day.date} day={day} />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default History;
