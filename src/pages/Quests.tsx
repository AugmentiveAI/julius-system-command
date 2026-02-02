import { BottomNav } from '@/components/navigation/BottomNav';
import { QuestsHeader } from '@/components/quests/QuestsHeader';
import { QuestCard } from '@/components/quests/QuestCard';
import { usePlayer } from '@/hooks/usePlayer';
import { useHistoryContext } from '@/contexts/HistoryContext';

const Quests = () => {
  const { quests, completedCount, totalCount, completeQuest, uncompleteQuest } = usePlayer();
  const { addCompletion } = useHistoryContext();

  // Sort quests: incomplete first, completed at bottom
  const sortedQuests = [...quests].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const handleToggle = (questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (quest?.completed) {
      uncompleteQuest(questId);
    } else {
      // Log to history before completing
      if (quest) {
        addCompletion({
          questId: quest.id,
          questTitle: quest.title,
          xpEarned: quest.xpReward,
          completedAt: new Date().toISOString(),
          type: 'daily',
        });
      }
      completeQuest(questId);
    }
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

        {/* Quests Header */}
        <QuestsHeader completedCount={completedCount} totalCount={totalCount} />

        {/* Quest List */}
        <div className="space-y-3">
          {sortedQuests.map(quest => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Quests;
