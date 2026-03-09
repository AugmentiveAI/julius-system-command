import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MilestonesHeader } from '@/components/milestones/MilestonesHeader';
import { MainQuestCard } from '@/components/milestones/MainQuestCard';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { ResistanceCard2 } from '@/components/dashboard/ResistanceCard';
import { SystemPredictions } from '@/components/dashboard/SystemPredictions';
import { WeeklySummaryCard } from '@/components/history/WeeklySummaryCard';
import { DayGroup } from '@/components/history/DayGroup';
import { AARHistoryCard } from '@/components/progress/AARHistoryCard';
import { LoopsPanel } from '@/components/progress/LoopsPanel';
import { CornerstoneCard } from '@/components/dashboard/CornerstoneCard';
import { AARModal } from '@/components/aar/AARModal';
import { WeeklyAARModal } from '@/components/aar/WeeklyAARModal';
import { usePlayer } from '@/hooks/usePlayer';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { useSystemStrategy } from '@/hooks/useSystemStrategy';
import { useAfterActionReview } from '@/hooks/useAfterActionReview';
import { useNarrativeLoops } from '@/hooks/useNarrativeLoops';
import { useCornerstone } from '@/hooks/useCornerstone';
import { DailyAAR } from '@/types/afterActionReview';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const SectionHeader = ({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between py-2 px-1 group"
  >
    <span className="font-mono text-xs font-semibold tracking-wider text-muted-foreground">
      {title}
    </span>
    <ChevronDown
      className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
    />
  </button>
);

const Progress = () => {
  const { player, mainQuests, completeMainQuest } = usePlayer();
  const { addCompletion, daysSummary, weeklySummary } = useHistoryContext();
  const { strategy } = useSystemStrategy();
  const aar = useAfterActionReview();
  const { activeLoops, breakLoop } = useNarrativeLoops();
  const { cornerstone, todayHonored } = useCornerstone();

  const [milestonesOpen, setMilestonesOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resistanceOpen, setResistanceOpen] = useState(false);
  const [predictionsOpen, setPredictionsOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(true);
  const [loopsOpen, setLoopsOpen] = useState(false);

  const [selectedAAR, setSelectedAAR] = useState<DailyAAR | null>(null);

  const completedCount = mainQuests.filter(q => q.completed).length;
  const sortedQuests = [...mainQuests].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

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
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
      {/* AAR Modals */}
      <AARModal
        aar={aar.todayAAR}
        open={aar.showDailyModal}
        onOpenChange={aar.setShowDailyModal}
      />
      <AARModal
        aar={selectedAAR}
        open={!!selectedAAR}
        onOpenChange={(open) => { if (!open) setSelectedAAR(null); }}
      />
      <WeeklyAARModal
        aar={aar.weeklyAAR}
        open={aar.showWeeklyModal}
        onOpenChange={aar.setShowWeeklyModal}
      />

      <div className="mx-auto max-w-md space-y-1 px-4">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">
          Progress
        </h1>

        {/* Cornerstone Card */}
        {cornerstone && (
          <div className="mb-3">
            <CornerstoneCard cornerstone={cornerstone} todayHonored={todayHonored} />
          </div>
        )}

        {/* Performance Reviews */}
        <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="PERFORMANCE REVIEWS" isOpen={reviewsOpen} onToggle={() => setReviewsOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pb-4">
              <AARHistoryCard
                history={aar.aarHistory}
                onSelectDay={(a) => setSelectedAAR(a)}
              />
              {aar.weeklyAAR && (
                <button
                  onClick={() => aar.setShowWeeklyModal(true)}
                  className="w-full py-2 rounded-md border border-secondary/30 bg-secondary/5 font-mono text-[10px] tracking-wider text-secondary uppercase hover:bg-secondary/10 transition-colors"
                >
                  View Weekly Report
                </button>
              )}
              {!aar.todayAAR && (
                <button
                  onClick={() => aar.generateDailyAAR()}
                  disabled={aar.isGenerating}
                  className="w-full py-2 rounded-md border border-primary/30 bg-primary/5 font-mono text-[10px] tracking-wider text-primary uppercase hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {aar.isGenerating ? 'Generating...' : 'Generate Daily Review Now'}
                </button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* Narrative Loops */}
        <Collapsible open={loopsOpen} onOpenChange={setLoopsOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader
                title={`BEHAVIORAL PATTERNS${activeLoops.length > 0 ? ` (${activeLoops.length})` : ''}`}
                isOpen={loopsOpen}
                onToggle={() => setLoopsOpen(o => !o)}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <LoopsPanel loops={activeLoops} onBreakLoop={breakLoop} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* a. Milestones */}
        <Collapsible open={milestonesOpen} onOpenChange={setMilestonesOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="MILESTONES" isOpen={milestonesOpen} onToggle={() => setMilestonesOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pb-4">
              <MilestonesHeader completedCount={completedCount} totalCount={mainQuests.length} />
              {sortedQuests.map(quest => (
                <MainQuestCard key={quest.id} quest={quest} onComplete={handleComplete} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* b. Core Stats */}
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="CORE STATS" isOpen={statsOpen} onToggle={() => setStatsOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <StatsRadarChart stats={player.stats} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* c. Quest History */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="QUEST LOG" isOpen={historyOpen} onToggle={() => setHistoryOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pb-4">
              {daysSummary.length === 0 ? (
                <p className="font-tech text-sm text-muted-foreground text-center py-4">
                  No quests completed yet.
                </p>
              ) : (
                daysSummary.map(day => <DayGroup key={day.date} day={day} />)
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* d. Resistance Analysis */}
        <Collapsible open={resistanceOpen} onOpenChange={setResistanceOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="RESISTANCE ANALYSIS" isOpen={resistanceOpen} onToggle={() => setResistanceOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <ResistanceCard2 />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* e. System Predictions */}
        <Collapsible open={predictionsOpen} onOpenChange={setPredictionsOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="SYSTEM PREDICTIONS" isOpen={predictionsOpen} onToggle={() => setPredictionsOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <SystemPredictions predictions={strategy.predictions} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="h-px bg-border" />

        {/* f. Weekly Summary */}
        <Collapsible open={weeklyOpen} onOpenChange={setWeeklyOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <SectionHeader title="WEEKLY SUMMARY" isOpen={weeklyOpen} onToggle={() => setWeeklyOpen(o => !o)} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <WeeklySummaryCard summary={weeklySummary} currentStreak={player.streak} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <BottomNav />
    </div>
  );
};

export default Progress;
