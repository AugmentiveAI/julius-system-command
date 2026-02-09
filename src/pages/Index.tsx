import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { FocusModeOverlay } from '@/components/focus/FocusModeOverlay';
import { useFocusModeContext } from '@/contexts/FocusModeContext';
import { useFocusMode } from '@/hooks/useFocusMode';
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
import { calibrateQuests, CalibratedQuest } from '@/utils/questCalibration';
import { usePersuasion } from '@/hooks/usePersuasion';
import { loadCachedResistance } from '@/utils/resistanceTracker';
import { PlayerStateCheck } from '@/types/playerState';
import { useLootDrops } from '@/hooks/useLootDrops';
import { LootDropToast } from '@/components/effects/LootDropToast';
import { LootCinematicReveal } from '@/components/effects/LootCinematicReveal';

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
  const focusMode = useFocusModeContext();

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
  let latestCheck: PlayerStateCheck | null = null;
  try {
    if (latestStateRaw) {
      const history: PlayerStateCheck[] = JSON.parse(latestStateRaw);
      if (history.length > 0) {
        systemRec = history[history.length - 1].systemRecommendation || 'steady';
        latestCheck = history[history.length - 1];
      }
    }
  } catch { /* ignore */ }

  // Calibrated quests for focus mode
  const calibration = useMemo(() => {
    if (!latestCheck) return null;
    try {
      const stateHistory: PlayerStateCheck[] = JSON.parse(localStorage.getItem('systemStateHistory') || '[]');
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const recentHistory = stateHistory.filter(c => new Date(c.timestamp) >= weekAgo);
      const completionHistory = JSON.parse(localStorage.getItem('systemCalibratedCompletions') || '[]');
      return calibrateQuests(latestCheck, recentHistory, completionHistory, new Date());
    } catch { return null; }
  }, [latestCheck]);

  const [completedCalibratedIds] = useState<Set<string>>(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const history = JSON.parse(localStorage.getItem('systemCalibratedCompletions') || '[]');
      return new Set(history.filter((c: any) => c.completedAt?.startsWith(today)).map((c: any) => c.questId));
    } catch { return new Set<string>(); }
  });

  const resistanceData = useMemo(() => loadCachedResistance(), []);
  const persuasionMap = usePersuasion(calibration?.recommendedQuests ?? [], latestCheck, resistanceData);

  // Pre-commitment
  const preCommitmentRaw = localStorage.getItem('systemPreCommitment');
  let preCommittedId: string | null = null;
  try {
    if (preCommitmentRaw) {
      const pc = JSON.parse(preCommitmentRaw);
      if (pc.date === new Date().toISOString().split('T')[0] && pc.accepted) {
        preCommittedId = pc.questId;
      }
    }
  } catch { /* ignore */ }

  const focus = useFocusMode(
    calibration?.recommendedQuests ?? [],
    completedCalibratedIds,
    quests,
    preCommittedId,
  );

  const { pendingDrop, rollForLoot, clearPendingDrop } = useLootDrops();

  // Handle focus mode quest completion
  const handleFocusComplete = useCallback(() => {
    if (!focus.currentQuest) return;
    const q = focus.currentQuest;
    // Toggle in protocol quests if it's a protocol quest
    const protocolQuest = quests.find(pq => pq.id === q.id);
    if (protocolQuest && !protocolQuest.completed) {
      toggleQuest(q.id);
    }
    focus.completeCurrentQuest();

    // Roll for loot drop
    const stat = protocolQuest?.stat ?? 'discipline';
    rollForLoot(stat, player.streak);
  }, [focus, quests, toggleQuest, rollForLoot, player.streak]);

  const handleFocusSkip = useCallback(() => {
    focus.skipCurrentQuest();
  }, [focus]);

  const handleFocusExit = useCallback(() => {
    focusMode.deactivate();
  }, [focusMode]);

  const handleFocusCompleteQuest = useCallback((questId: string) => {
    // Also toggle protocol quest if applicable
    const protocolQuest = quests.find(pq => pq.id === questId);
    if (protocolQuest && !protocolQuest.completed) {
      toggleQuest(questId);
    }
  }, [quests, toggleQuest]);

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

  const currentPersuasion = focus.currentQuest
    ? persuasionMap.get(focus.currentQuest.id) ?? null
    : null;

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />

      {/* Loot Drop Overlays */}
      {pendingDrop && !pendingDrop.isCinematic && (
        <LootDropToast item={pendingDrop.item} show={true} onDone={clearPendingDrop} />
      )}
      {pendingDrop && pendingDrop.isCinematic && (
        <LootCinematicReveal item={pendingDrop.item} show={true} onDone={clearPendingDrop} />
      )}

      {/* Focus Mode Overlay */}
      <FocusModeOverlay
        active={focusMode.active}
        currentQuest={focus.currentQuest}
        allDone={focus.allDone}
        remainingCount={focus.remainingCount}
        totalCount={focus.totalCount}
        completedCount={focus.completedCount}
        lastXPAwarded={focus.lastXPAwarded}
        showXPAnimation={focus.showXPAnimation}
        persuasionData={currentPersuasion}
        sprintTimeRemaining={null}
        degradationLevel={focus.degradationLevel}
        sessionSkipCount={focus.sessionSkipCount}
        onComplete={handleFocusComplete}
        onSkip={handleFocusSkip}
        onExit={handleFocusExit}
        onCompleteQuest={handleFocusCompleteQuest}
      />

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

      <div className="min-h-screen bg-background pt-2" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
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
