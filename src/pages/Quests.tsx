import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TimeBlockSection } from '@/components/quests/TimeBlockSection';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { QuestTimeBlock } from '@/types/quests';

function getTimeUntilMidnight(): { hours: number; minutes: number } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}

const TIME_BLOCKS: QuestTimeBlock[] = ['morning', 'midday', 'afternoon', 'evening'];

const Quests = () => {
  const { quests, toggleQuest, getQuestsByTimeBlock, getTimeBlockStats, getTotalStats } =
    useProtocolQuests();
  const { addCompletion } = useHistoryContext();
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight);

  const totalStats = getTotalStats();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilMidnight());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      // Log to history before completing
      const totalXp = quest.xp + (quest.geneticBonus?.bonusXp || 0);
      addCompletion({
        questId: quest.id,
        questTitle: quest.title,
        xpEarned: totalXp,
        completedAt: new Date().toISOString(),
        type: 'daily',
      });
    }
    toggleQuest(questId);
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
        </div>

        {/* Daily XP Header */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Daily Protocol
              </h2>
              <p className="mt-1 font-tech text-lg">
                <span className="text-primary">{totalStats.earnedXp}</span>
                <span className="text-muted-foreground"> / {totalStats.totalXp} XP</span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-tech text-sm">
                Resets in {timeUntilReset.hours}h {timeUntilReset.minutes}m
              </span>
            </div>
          </div>

          {totalStats.completed === totalStats.total && (
            <div className="mt-3 rounded-md bg-green-500/10 px-3 py-2 text-center">
              <p className="font-tech text-sm text-green-400">
                Protocol complete. The System is pleased.
              </p>
            </div>
          )}
        </div>

        {/* Time Block Sections */}
        <div className="space-y-3">
          {TIME_BLOCKS.map(timeBlock => (
            <TimeBlockSection
              key={timeBlock}
              timeBlock={timeBlock}
              quests={getQuestsByTimeBlock(timeBlock)}
              stats={getTimeBlockStats(timeBlock)}
              onToggleQuest={handleToggle}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Quests;
