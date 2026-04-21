import { useState, useMemo } from 'react';
import { ChevronDown, TrendingUp, BarChart3 } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { TrajectoryForecaster } from '@/components/dashboard/TrajectoryForecaster';
import { WeeklySummaryCard } from '@/components/history/WeeklySummaryCard';
import { AARHistoryCard } from '@/components/progress/AARHistoryCard';
import { LoopsPanel } from '@/components/progress/LoopsPanel';
import { ShadowIntelPanel } from '@/components/shadows/ShadowIntelPanel';
import { RomTracker } from '@/components/training/RomTracker';
import { AARModal } from '@/components/aar/AARModal';
import { WeeklyAARModal } from '@/components/aar/WeeklyAARModal';
import { MainQuestCard } from '@/components/milestones/MainQuestCard';
import { MilestonesHeader } from '@/components/milestones/MilestonesHeader';
import { usePlayer } from '@/hooks/usePlayer';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { useSystemStrategy } from '@/hooks/useSystemStrategy';
import { useAfterActionReview } from '@/hooks/useAfterActionReview';
import { useNarrativeLoops } from '@/hooks/useNarrativeLoops';
import { useShadowIntelSlice } from '@/contexts/jarvisSlices';
import { DailyAAR } from '@/types/afterActionReview';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const SectionRow = ({ title, isOpen, onToggle, count }: { title: string; isOpen: boolean; onToggle: () => void; count?: number }) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-2.5 px-1 group">
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">{title}</span>
      {count !== undefined && count > 0 && (
        <span className="font-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">{count}</span>
      )}
    </div>
    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </button>
);

const Intel = () => {
  const { player, mainQuests, completeMainQuest } = usePlayer();
  const { addCompletion, weeklySummary } = useHistoryContext();
  const { strategy } = useSystemStrategy();
  const aar = useAfterActionReview();
  const { activeLoops, breakLoop } = useNarrativeLoops();
  const shadowIntel = useShadowIntelSlice();

  const [trajectoryOpen, setTrajectoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [patternsOpen, setPatternsOpen] = useState(true);
  const [intelOpen, setIntelOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [selectedAAR, setSelectedAAR] = useState<DailyAAR | null>(null);

  const completedCount = mainQuests.filter(q => q.completed).length;
  const sortedQuests = [...mainQuests].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  const handleComplete = (questId: string) => {
    const quest = mainQuests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      addCompletion({ questId: quest.id, questTitle: quest.title, xpEarned: quest.xpReward, completedAt: new Date().toISOString(), type: 'main' });
      completeMainQuest(questId);
    }
  };

  // Stats compact view
  const statValues = Object.entries(player.stats).map(([key, val]) => ({ key, val: val as number }));

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
      <AARModal aar={selectedAAR} open={!!selectedAAR} onOpenChange={(open) => { if (!open) setSelectedAAR(null); }} />
      <AARModal aar={aar.todayAAR} open={aar.showDailyModal} onOpenChange={aar.setShowDailyModal} />
      <WeeklyAARModal aar={aar.weeklyAAR} open={aar.showWeeklyModal} onOpenChange={aar.setShowWeeklyModal} />

      <div className="mx-auto max-w-md space-y-0 px-4">
        <h1 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-4">INTEL</h1>

        {/* A. Trajectory */}
        <Collapsible open={trajectoryOpen} onOpenChange={setTrajectoryOpen}>
          <CollapsibleTrigger asChild>
            <div><SectionRow title="TRAJECTORY" isOpen={trajectoryOpen} onToggle={() => setTrajectoryOpen(o => !o)} /></div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4">
              <TrajectoryForecaster intelligence={null} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="h-px bg-border" />

        {/* B. Stats — compact row, expandable to radar */}
        <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
          <CollapsibleTrigger asChild>
            <div>
              <button onClick={() => setStatsOpen(o => !o)} className="w-full flex items-center justify-between py-2.5 px-1">
                <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-muted-foreground">STATS</span>
                <div className="flex items-center gap-3">
                  {statValues.map(s => (
                    <span key={s.key} className="font-mono text-[9px] text-foreground/70">
                      {s.key.slice(0, 3).toUpperCase()} {s.val}
                    </span>
                  ))}
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4"><StatsRadarChart stats={player.stats} /></div>
          </CollapsibleContent>
        </Collapsible>
        <div className="h-px bg-border" />

        {/* C. Pattern Intelligence */}
        <Collapsible open={patternsOpen} onOpenChange={setPatternsOpen}>
          <CollapsibleTrigger asChild>
            <div><SectionRow title="PATTERN INTELLIGENCE" isOpen={patternsOpen} onToggle={() => setPatternsOpen(o => !o)} /></div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pb-4">
              <AARHistoryCard history={aar.aarHistory} onSelectDay={(a) => setSelectedAAR(a)} />
              {!aar.todayAAR && (
                <button
                  onClick={() => aar.generateDailyAAR()}
                  disabled={aar.isGenerating}
                  className="w-full py-2 rounded-md border border-primary/30 bg-primary/5 font-mono text-[10px] tracking-wider text-primary uppercase hover:bg-primary/10 disabled:opacity-50"
                >
                  {aar.isGenerating ? 'Generating...' : 'Generate Daily Review'}
                </button>
              )}
              {activeLoops.length > 0 && <LoopsPanel loops={activeLoops} onBreakLoop={breakLoop} />}
              <WeeklySummaryCard summary={weeklySummary} currentStreak={player.streak} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="h-px bg-border" />

        {/* D. Shadow Intel */}
        {shadowIntel && shadowIntel.unreadCount > 0 && (
          <>
            <Collapsible open={intelOpen} onOpenChange={setIntelOpen}>
              <CollapsibleTrigger asChild>
                <div><SectionRow title="SHADOW INTEL" isOpen={intelOpen} onToggle={() => setIntelOpen(o => !o)} count={shadowIntel.unreadCount} /></div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pb-4">
                  <ShadowIntelPanel
                    findings={shadowIntel.findings}
                    onMarkRead={(id) => shadowIntel.updateStatus(id, 'read')}
                    onActOn={(id) => shadowIntel.updateStatus(id, 'acted_on')}
                    onDismiss={(id) => shadowIntel.updateStatus(id, 'dismissed')}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="h-px bg-border" />
          </>
        )}

        {/* E. Recovery */}
        <Collapsible open={recoveryOpen} onOpenChange={setRecoveryOpen}>
          <CollapsibleTrigger asChild>
            <div><SectionRow title="RECOVERY" isOpen={recoveryOpen} onToggle={() => setRecoveryOpen(o => !o)} /></div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pb-4"><RomTracker /></div>
          </CollapsibleContent>
        </Collapsible>
        <div className="h-px bg-border" />

        {/* Milestones */}
        <Collapsible open={milestonesOpen} onOpenChange={setMilestonesOpen}>
          <CollapsibleTrigger asChild>
            <div><SectionRow title="MILESTONES" isOpen={milestonesOpen} onToggle={() => setMilestonesOpen(o => !o)} /></div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 pb-4">
              <MilestonesHeader completedCount={completedCount} totalCount={mainQuests.length} />
              {sortedQuests.map(quest => <MainQuestCard key={quest.id} quest={quest} onComplete={handleComplete} />)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <BottomNav />
    </div>
  );
};

export default Intel;
