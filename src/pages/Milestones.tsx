import { BottomNav } from '@/components/navigation/BottomNav';
import { MilestonesHeader } from '@/components/milestones/MilestonesHeader';
import { MainQuestCard } from '@/components/milestones/MainQuestCard';
import { usePlayer } from '@/hooks/usePlayer';
import { useHistoryContext } from '@/contexts/HistoryContext';

const Milestones = () => {
  const { mainQuests, completeMainQuest } = usePlayer();
  const { addCompletion } = useHistoryContext();

  const completedCount = mainQuests.filter(q => q.completed).length;
  const totalCount = mainQuests.length;

  // Sort: incomplete first, completed at bottom
  const sortedQuests = [...mainQuests].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const handleComplete = (questId: string) => {
    const quest = mainQuests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      addCompletion({
        questId: quest.id,
        questTitle: quest.title,
        xpEarned: quest.xpReward,
        completedAt: new Date().toISOString(),
        type: 'main',
      });
      completeMainQuest(questId);
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

        {/* Milestones Header */}
        <MilestonesHeader completedCount={completedCount} totalCount={totalCount} />

        {/* Main Quest List */}
        <div className="space-y-4">
          {sortedQuests.map(quest => (
            <MainQuestCard
              key={quest.id}
              quest={quest}
              onComplete={handleComplete}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Milestones;
