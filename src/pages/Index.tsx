import { useEffect, useRef, useState, useCallback } from 'react';
import { TopBar } from '@/components/dashboard/TopBar';
import { DashboardMessage } from '@/components/dashboard/DashboardMessage';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import StateCheck from '@/components/StateCheck';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { GeneticWarning } from '@/components/warnings/GeneticWarning';
import { BottomNav } from '@/components/navigation/BottomNav';
import { WeeklyPlanningModal } from '@/components/planning/WeeklyPlanningModal';
import { usePlayer } from '@/hooks/usePlayer';
import { useCaffeine } from '@/hooks/useCaffeine';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useWorkout } from '@/hooks/useWorkout';
import { useDailyXP } from '@/hooks/useDailyXP';
import { useGeneticState } from '@/hooks/useGeneticState';
import { useToast } from '@/hooks/use-toast';
import { useSystemStrategy } from '@/hooks/useSystemStrategy';
import { getSystemToast } from '@/utils/systemVoice';
import { useWeeklyPlanning } from '@/hooks/useWeeklyPlanning';

const LAST_SCAN_DATE_KEY = 'systemLastScanDate';

function needsDailyScan(): boolean {
  const today = new Date().toISOString().split('T')[0];
  return localStorage.getItem(LAST_SCAN_DATE_KEY) !== today;
}

function markScanDone() {
  localStorage.setItem(LAST_SCAN_DATE_KEY, new Date().toISOString().split('T')[0]);
}

/** Build a concise one-line daily message from strategy data */
function buildDailyOneLiner(brief: string): string {
  // Take just the first sentence of the daily brief
  const firstSentence = brief.split(/[.!]/).filter(Boolean)[0]?.trim();
  if (firstSentence && firstSentence.length <= 80) return firstSentence + '.';
  // Fallback: truncate
  if (firstSentence) return firstSentence.slice(0, 77) + '...';
  return 'The System awaits. Begin your quests.';
}

interface IndexProps {
  forceFirstScan?: boolean;
  onScanTriggered?: () => void;
}

const Index = ({ forceFirstScan, onScanTriggered }: IndexProps) => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState } = usePlayer();
  const { logCaffeine, hasLoggedAfter10am, warningDismissed, dismissWarning, logs } = useCaffeine();
  const { toggleQuest, setQuestCompleted, quests } = useProtocolQuests();
  const { workout, workoutCompleted } = useWorkout();
  const { toast } = useToast();
  const { strategy, dayNumber, playerTitle } = useSystemStrategy();
  const { logColdExposure } = useGeneticState();
  const weekly = useWeeklyPlanning();

  const [scanOpen, setScanOpen] = useState(false);
  const autoScanRef = useRef(false);

  const dailyXP = useDailyXP({
    quests,
    workoutCompleted,
    workoutXP: workout.xp,
    coldStreakDays: player.coldStreak ?? 0,
  });

  // Determine system recommendation from latest state
  const latestStateRaw = localStorage.getItem('systemStateHistory');
  let systemRec: 'push' | 'steady' | 'recover' = 'steady';
  try {
    if (latestStateRaw) {
      const history = JSON.parse(latestStateRaw);
      if (history.length > 0) {
        systemRec = history[history.length - 1].systemRecommendation || 'steady';
      }
    }
  } catch { /* ignore */ }

  // Force first scan after awakening sequence
  useEffect(() => {
    if (forceFirstScan) {
      setScanOpen(true);
      onScanTriggered?.();
    }
  }, [forceFirstScan, onScanTriggered]);

  // Auto-trigger scan on first daily load
  useEffect(() => {
    if (needsDailyScan() && !autoScanRef.current && !forceFirstScan) {
      autoScanRef.current = true;
      toast(getSystemToast('stateScanRequired'));
      setTimeout(() => setScanOpen(true), 800);
    }
  }, [toast, forceFirstScan]);

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) markScanDone();
  }, []);

  // --- Cross-system sync effects ---
  const syncedRef = useRef({ workout: false, caffeine: false });
  const achievementRef = useRef({ morning: false, allDaily: false });

  useEffect(() => {
    const morningQuests = quests.filter(q => q.timeBlock === 'morning');
    const allMorningDone = morningQuests.length > 0 && morningQuests.every(q => q.completed);
    if (allMorningDone && !achievementRef.current.morning) {
      achievementRef.current.morning = true;
      toast(getSystemToast('morningProtocol'));
    }
    if (!allMorningDone) achievementRef.current.morning = false;
  }, [quests, toast]);

  useEffect(() => {
    const allDone = quests.length > 0 && quests.every(q => q.completed);
    if (allDone && !achievementRef.current.allDaily) {
      achievementRef.current.allDaily = true;
      toast(getSystemToast('dailyProtocol'));
    }
    if (!allDone) achievementRef.current.allDaily = false;
  }, [quests, toast]);

  useEffect(() => {
    if (workoutCompleted && !syncedRef.current.workout) {
      syncedRef.current.workout = true;
      setQuestCompleted('scheduled-training', true);
    }
    if (!workoutCompleted) syncedRef.current.workout = false;
  }, [workoutCompleted, setQuestCompleted]);

  useEffect(() => {
    if (hasLoggedAfter10am) setQuestCompleted('caffeine-cutoff', false);
  }, [hasLoggedAfter10am, setQuestCompleted]);

  const handleLogCaffeine = () => {
    logCaffeine();
    const now = new Date();
    const isAfter10 = now.getHours() >= 10;
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    toast(getSystemToast(isAfter10 ? 'caffeineDebuff' : 'caffeineLogged', { time }));
  };

  const handleLogCold = () => {
    logColdExposure();
    setQuestCompleted('cold-exposure', true);
    toast({ title: '🧊 Cold Exposure Logged', description: 'The System acknowledges your discipline.' });
  };

  // Supplement quest states for the checklist
  const supplementIds = ['morning-supplements', 'midday-supplements', 'evening-supplements'];
  const supplementStates: Record<string, boolean> = {};
  supplementIds.forEach(id => {
    const q = quests.find(q => q.id === id);
    supplementStates[id] = q?.completed ?? false;
  });

  const completedQuests = quests.filter(q => q.completed).length;
  const oneLiner = buildDailyOneLiner(strategy.dailyBrief);

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />
      <WeeklyPlanningModal
        open={weekly.showModal}
        onOpenChange={weekly.setShowModal}
        summary={weekly.summary}
        initialPriorities={weekly.autoPriorities}
        initialAllocation={weekly.defaultAllocation}
        onLock={(priorities, allocation) => {
          weekly.lockPlan(priorities, allocation);
          const totalBlocks = allocation.thursday.length + allocation.friday.length + allocation.saturday.length;
          toast({
            title: 'Sprint plan locked.',
            description: `${totalBlocks} sprint blocks allocated across 3 days. Execute.`,
            duration: 3000,
          });
        }}
        onDismiss={weekly.dismiss}
        isAutoView={weekly.trigger === 'thursday-fallback' && !weekly.plan?.locked}
        onApprove={() => {
          weekly.autoLockPlan();
          toast({ title: 'Auto-plan approved.', duration: 1500 });
        }}
      />

      <div className="min-h-screen bg-background pb-24 pt-2">
        {/* 1. Top Bar */}
        <TopBar systemRecommendation={systemRec} />

        <div className="mx-auto max-w-md space-y-5 px-4 mt-2">
          {/* Caffeine Warning */}
          {hasLoggedAfter10am && !warningDismissed && (
            <GeneticWarning
              level="danger"
              title="☕ Caffeine Debuff Active"
              message="CYP1A2 slow metabolism detected. Caffeine after 10am will disrupt sleep."
              actionRequired="No more caffeine today. Consider L-theanine for focus."
              onDismiss={dismissWarning}
            />
          )}

          {/* Penalty Banner */}
          <PenaltyBanner
            penaltyLevel={penaltyLevel}
            onDismiss={dismissPenaltyBanner}
            isDismissed={player.penalty.bannerDismissedForSession}
          />

          {/* 2. System Message + CTA */}
          <DashboardMessage message={oneLiner} />

          {/* 3. Progress Ring */}
          <ProgressRing
            progress={strategy.shadowMonarchProgress}
            title={playerTitle}
            currentXP={player.currentXP}
            xpToNextLevel={player.xpToNextLevel}
            level={player.level}
          />

          {/* 4. Today's Snapshot */}
          <TodaySnapshot
            questsCompleted={completedQuests}
            questsTotal={quests.length}
            xpToday={dailyXP.total}
            streak={player.streak}
          />

          {/* 5. Quick Actions */}
          <DashboardActions
            onScan={() => setScanOpen(true)}
            onCold={handleLogCold}
            onCaffeine={handleLogCaffeine}
            supplementStates={supplementStates}
            onToggleSupplement={toggleQuest}
          />
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Index;
