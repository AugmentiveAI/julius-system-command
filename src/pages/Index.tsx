import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { StatusStrip } from '@/components/dashboard/StatusStrip';
import { HeroCard } from '@/components/feed/HeroCard';
import { SystemFeedCard } from '@/components/feed/SystemFeedCard';
import { MissionBatch } from '@/components/feed/MissionBatch';
import { BottomNav } from '@/components/navigation/BottomNav';
import { usePlayer } from '@/hooks/usePlayer';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useWorkout } from '@/hooks/useWorkout';
import { useDailyXP } from '@/hooks/useDailyXP';
import { useGeneticState } from '@/hooks/useGeneticState';
import { useToast } from '@/hooks/use-toast';
import { useSystemStrategy } from '@/hooks/useSystemStrategy';
import { getSystemToast } from '@/utils/systemVoice';
import { useCaffeine } from '@/hooks/useCaffeine';
import { usePillarQuests } from '@/hooks/usePillarQuests';
import { usePillarStreak } from '@/hooks/usePillarStreak';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';
import { useShadowArmy } from '@/hooks/useShadowArmy';
import { useDungeons } from '@/hooks/useDungeons';
import {
  useGeneticPhaseSlice,
  useHighestInterventionSlice,
  useLogColdExposureCallback,
} from '@/contexts/jarvisSlices';
import { useEmergencyQuests } from '@/hooks/useEmergencyQuests';
import { useAfterActionReview } from '@/hooks/useAfterActionReview';
import { useNarrativeLoops } from '@/hooks/useNarrativeLoops';
import { useCornerstone } from '@/hooks/useCornerstone';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { useLootDrops } from '@/hooks/useLootDrops';
import { useShadowQuest } from '@/hooks/useShadowQuest';
import { useSystemIntelligenceAI } from '@/hooks/useSystemIntelligenceAI';
import { useSkills } from '@/hooks/useSkills';
import { useSkillMastery } from '@/hooks/useSkillMastery';
import { useQuestChains } from '@/hooks/useQuestChains';
import { usePenaltyDungeon } from '@/hooks/usePenaltyDungeon';
import { usePreCommitment } from '@/hooks/usePreCommitment';
import { useWeeklyPlanning } from '@/hooks/useWeeklyPlanning';
import { useFocusModeContext } from '@/contexts/FocusModeContext';
import { useFocusMode } from '@/hooks/useFocusMode';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import { QuestCompletionRecord } from '@/utils/questCalibration';
import { PlayerStateCheck } from '@/types/playerState';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { getRankForLevel } from '@/types/skills';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { AriseOverlay } from '@/components/effects/AriseOverlay';
import { RankUpOverlay } from '@/components/effects/RankUpOverlay';
import { LootDropToast } from '@/components/effects/LootDropToast';
import { FocusModeOverlay } from '@/components/focus/FocusModeOverlay';
import StateCheck from '@/components/StateCheck';
import { StatusWindow } from '@/components/dashboard/StatusWindow';
import { PenaltyDungeonOverlay } from '@/components/effects/PenaltyDungeonOverlay';
import { EmergencyQuestBanner } from '@/components/quests/EmergencyQuestBanner';
import { AARModal } from '@/components/aar/AARModal';
import { WeeklyPlanningModal } from '@/components/planning/WeeklyPlanningModal';
import { ChainStartModal } from '@/components/chains/ChainStartModal';
import CaptureFAB from '@/components/capture/CaptureFAB';

// PR1a — extracted hooks
import { useIndexMissionGraph } from '@/hooks/index/useIndexMissionGraph';
import { useMissionToggleRouter } from '@/hooks/index/useMissionToggleRouter';
import { useAutoDeployIntelligence } from '@/hooks/index/useAutoDeployIntelligence';
import { useDashboardHero } from '@/hooks/index/useDashboardHero';

// ── Local storage helpers (kept out of hooks since they're side-effect readers) ──

const LAST_SCAN_DATE_KEY = 'systemLastScanDate';
const STATE_HISTORY_KEY = 'systemStateHistory';
const CALIBRATED_COMPLETIONS_KEY = 'systemCalibratedCompletions';

function needsDailyScan(): boolean {
  return localStorage.getItem(LAST_SCAN_DATE_KEY) !== getSystemDate();
}
function markScanDone() {
  localStorage.setItem(LAST_SCAN_DATE_KEY, getSystemDate());
}

function getLatestTodayCheck(): PlayerStateCheck | null {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (!stored) return null;
    const checks: PlayerStateCheck[] = JSON.parse(stored);
    const today = getSystemDate();
    const todayChecks = checks.filter(c =>
      new Date(c.timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }) === today
    );
    return todayChecks.length > 0 ? todayChecks[todayChecks.length - 1] : null;
  } catch { return null; }
}

function getStateHistory(): PlayerStateCheck[] {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (!stored) return [];
    const checks: PlayerStateCheck[] = JSON.parse(stored);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return checks.filter(c => new Date(c.timestamp) >= weekAgo);
  } catch { return []; }
}

function getCompletionHistory(): QuestCompletionRecord[] {
  try {
    const stored = localStorage.getItem(CALIBRATED_COMPLETIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCompletionRecord(record: QuestCompletionRecord) {
  try {
    const history = getCompletionHistory();
    history.push(record);
    localStorage.setItem(CALIBRATED_COMPLETIONS_KEY, JSON.stringify(history.slice(-200)));
  } catch { /* ignore */ }
}

interface IndexProps {
  forceFirstScan?: boolean;
  onScanTriggered?: () => void;
}

const Index = ({ forceFirstScan, onScanTriggered }: IndexProps) => {
  const {
    player, penaltyLevel, dismissPenaltyBanner: _dismissPenaltyBanner,
    levelUpState, addXP, reduceStat, resetPenaltyDays,
  } = usePlayer();
  const { hasLoggedAfter10am } = useCaffeine();
  const { toggleQuest, setQuestCompleted, quests } = useProtocolQuests();
  const { workout, workoutCompleted } = useWorkout();
  useTrainingLog(); // hydrate training log context
  const { toast } = useToast();
  const { strategy } = useSystemStrategy();
  const { intelligence } = useSystemIntelligenceAI();
  useGeneticState();
  const weekly = useWeeklyPlanning();
  const focusMode = useFocusModeContext();
  const pillar = usePillarQuests();
  const pillarStreak = usePillarStreak();
  const { addNotification } = useSystemNotifications();
  const { shadows, addShadow } = useShadowArmy();
  const { completedDungeons } = useDungeons();
  const { addCompletion } = useHistoryContext();
  usePreCommitment(); // hydrate
  const highestPriority = useHighestInterventionSlice();
  const _logColdExposure = useLogColdExposureCallback();
  const emergency = useEmergencyQuests();
  const aarReview = useAfterActionReview();
  const { newLoopDetected } = useNarrativeLoops();
  const { cornerstone, todayHonored } = useCornerstone();
  const geneticPhase = useGeneticPhaseSlice();

  // ── Local UI state ─────────────────────────────────────────
  const [ariseState, setAriseState] = useState({ show: false, name: '' });
  const [statusWindowOpen, setStatusWindowOpen] = useState(false);
  const [rankUpState, setRankUpState] = useState({ show: false, rank: '' });
  const prevRankRef = useRef(player.title);
  const [scanOpen, setScanOpen] = useState(false);
  const autoScanRef = useRef(false);
  const [todayCheck, setTodayCheck] = useState<PlayerStateCheck | null>(getLatestTodayCheck);
  const [chainModalOpen, setChainModalOpen] = useState(false);

  // Latest state check (today's, falling back to most recent)
  const latestCheck = useMemo<PlayerStateCheck | null>(() => {
    try {
      const raw = localStorage.getItem(STATE_HISTORY_KEY);
      if (!raw) return null;
      const history: PlayerStateCheck[] = JSON.parse(raw);
      return history.length > 0 ? history[history.length - 1] : null;
    } catch { return null; }
  }, []);
  const activeCheck = todayCheck || latestCheck;

  // ── Auto-deploy System Intelligence (extracted) ───────────
  useAutoDeployIntelligence({
    intelligence,
    addShadow,
    onShadowDeployed: (name) => setAriseState({ show: true, name }),
    addNotification,
  });

  // ── Skills + skill mastery ────────────────────────────────
  const skillCtx = useMemo(() => ({
    player, shadowCount: shadows.length, dungeonClears: completedDungeons.length, pillarStreak: pillarStreak.streak,
  }), [player, shadows.length, completedDungeons.length, pillarStreak.streak]);
  const { unlockedSkills } = useSkills(skillCtx);

  const penaltyDungeon = usePenaltyDungeon({
    player, onStatReduction: reduceStat, onXPGained: addXP, onPenaltyCleared: resetPenaltyDays, addNotification,
  });

  const { recordQuestForMastery, levelUpSkill } = useSkillMastery();
  const questChains = useQuestChains();

  // ── Calibrated completion bookkeeping ─────────────────────
  const [completedCalibratedIds, setCompletedCalibratedIds] = useState<Set<string>>(() => {
    try {
      const today = getSystemDate();
      return new Set(getCompletionHistory().filter(c => c.completedAt.startsWith(today)).map(c => c.questId));
    } catch { return new Set<string>(); }
  });

  // ── Mission graph (extracted) ─────────────────────────────
  const {
    missions,
    legacyMissions,
    calibration,
    persuasionMap,
    shadowQuest,
    completeShadow,
    onCalibratedQuestCompleted,
  } = useIndexMissionGraph({
    activeCheck,
    completedCalibratedIds,
    getStateHistory,
    getCompletionHistory,
  });

  // Daily XP totals (kept for future side-effects; values read by hooks downstream)
  useDailyXP({
    quests, workoutCompleted, workoutXP: workout.xp, coldStreakDays: player.coldStreak ?? 0,
  });

  // ── Loot ──────────────────────────────────────────────────
  const { pendingDrop, rollForLoot, clearPendingDrop } = useLootDrops();

  // ── System Feed (extracted) ───────────────────────────────
  const { heroItem, visibleFeed, dismiss: dismissFeedItem } = useDashboardHero({
    strategy,
    intelligence,
    highestPriority,
    cornerstone,
    todayHonored,
    newLoopDetected,
    penaltyLevel,
    questChains: questChains.activeChains,
    levelUpSkill,
    shadows,
    geneticPhase,
  });

  // ── Mission toggle router (discriminated union) ───────────
  const handleMissionToggle = useMissionToggleRouter({
    missions,
    quests,
    toggleQuest,
    pillar,
    pillarStreak,
    shadowQuest,
    completeShadow,
    calibration,
    persuasionMap,
    setCompletedCalibratedIds,
    saveCompletionRecord,
    onCalibratedQuestCompleted,
    addCompletion,
    addXP,
    rollForLoot,
    recordQuestForMastery,
    player,
  });

  // ── Pre-commitment id (for focus mode) ───────────────────
  const preCommittedId = useMemo<string | null>(() => {
    try {
      const raw = localStorage.getItem('systemPreCommitment');
      if (!raw) return null;
      const pc = JSON.parse(raw);
      return pc.date === getSystemDate() && pc.accepted ? pc.questId : null;
    } catch { return null; }
  }, []);

  const focus = useFocusMode(calibration?.recommendedQuests ?? [], completedCalibratedIds, quests, preCommittedId);

  // ── Auto-scan ────────────────────────────────────────────
  useEffect(() => {
    if (forceFirstScan) { setScanOpen(true); onScanTriggered?.(); }
  }, [forceFirstScan, onScanTriggered]);

  useEffect(() => {
    const checkScan = () => {
      if (needsDailyScan() && !forceFirstScan) {
        toast(getSystemToast('stateScanRequired'));
        setTimeout(() => setScanOpen(true), 800);
      }
    };
    if (!autoScanRef.current) { autoScanRef.current = true; checkScan(); }
    const handleVisibility = () => { if (document.visibilityState === 'visible') checkScan(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [toast, forceFirstScan]);

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) { markScanDone(); setTodayCheck(getLatestTodayCheck()); }
  }, []);

  // ── Sync side-effects ────────────────────────────────────
  useEffect(() => {
    if (workoutCompleted) setQuestCompleted('scheduled-training', true);
  }, [workoutCompleted, setQuestCompleted]);

  useEffect(() => {
    if (hasLoggedAfter10am) setQuestCompleted('caffeine-cutoff', false);
  }, [hasLoggedAfter10am, setQuestCompleted]);

  // ── Rank-up detection ────────────────────────────────────
  useEffect(() => {
    const expectedRank = getRankForLevel(player.level);
    if (expectedRank !== prevRankRef.current) {
      setRankUpState({ show: true, rank: expectedRank });
      addNotification('rank_up', `Rank: ${expectedRank}`, `Promoted to ${expectedRank}.`, { rank: expectedRank });
      prevRankRef.current = expectedRank;
    }
  }, [player.level, addNotification]);

  // ── All-complete celebration ────────────────────────────
  const totalMissions = missions.length;
  const completedMissions = missions.filter(m => m.completed).length;
  const allComplete = totalMissions > 0 && completedMissions >= totalMissions;
  const achievementRef = useRef({ morning: false, allDaily: false });

  useEffect(() => {
    if (allComplete && !achievementRef.current.allDaily) {
      achievementRef.current.allDaily = true;
      toast(getSystemToast('allQuestsComplete'));
    }
    if (!allComplete) achievementRef.current.allDaily = false;
  }, [allComplete, toast]);

  // ── Focus mode complete ─────────────────────────────────
  const handleFocusComplete = useCallback(() => {
    if (!focus.currentQuest) return;
    const q = focus.currentQuest;
    const protocolQuest = quests.find(pq => pq.id === q.id);
    if (protocolQuest && !protocolQuest.completed) {
      addXP(protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0));
      toggleQuest(q.id);
    }
    focus.completeCurrentQuest();
    rollForLoot(protocolQuest?.stat ?? 'discipline', player.streak);
  }, [focus, quests, toggleQuest, addXP, rollForLoot, player.streak]);

  const currentPersuasion = focus.currentQuest ? persuasionMap.get(focus.currentQuest.id) ?? null : null;

  // ── Feed action handler ─────────────────────────────────
  const handleFeedAction = useCallback((handler: string) => {
    if (handler === 'expand_missions') {
      // MissionBatch owns its expansion state; this is a placeholder hook.
      return;
    }
    if (handler.startsWith('chain:')) {
      const chainId = handler.split(':')[1];
      const chain = questChains.activeChains.find(c => c.id === chainId);
      if (chain) {
        questChains.completeStep(chainId).then(result => {
          if (result.xpEarned > 0) {
            addXP(result.xpEarned);
            addCompletion({ questId: `chain-${chainId}`, questTitle: chain.title, xpEarned: result.xpEarned, completedAt: new Date().toISOString(), type: 'daily' });
            recordQuestForMastery(`chain-${chain.stat}`, chain.title);
            if (result.chainCompleted) {
              toast({ title: 'CHAIN COMPLETE', description: `+${result.xpEarned} XP. The System acknowledges your persistence.`, duration: 3000 });
            }
          }
        });
      }
    }
  }, [questChains, addXP, addCompletion, recordQuestForMastery, toast]);

  return (
    <>
      {/* Tier 1 Overlays */}
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <AriseOverlay show={ariseState.show} shadowName={ariseState.name} onDone={() => setAriseState({ show: false, name: '' })} />
      <RankUpOverlay show={rankUpState.show} newRank={rankUpState.rank} onDone={() => setRankUpState({ show: false, rank: '' })} />
      {pendingDrop && <LootDropToast item={pendingDrop.item} show={true} onDone={clearPendingDrop} />}

      {penaltyDungeon.isPenaltyActive && penaltyDungeon.activePenalty && (
        <PenaltyDungeonOverlay
          dungeon={penaltyDungeon.activePenalty}
          timeRemaining={penaltyDungeon.timeRemaining}
          lowestStat={penaltyDungeon.lowestStat}
          penaltyReduction={penaltyDungeon.penaltyReduction}
          showFailure={penaltyDungeon.showFailure}
          onCompleteObjective={penaltyDungeon.completeObjective}
        />
      )}

      <StatusWindow open={statusWindowOpen} onOpenChange={setStatusWindowOpen} player={player} shadows={shadows} dungeonClears={completedDungeons.length} skills={unlockedSkills} />
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />
      <AARModal aar={aarReview.todayAAR} open={aarReview.showDailyModal} onOpenChange={aarReview.setShowDailyModal} />

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
        onSkip={() => focus.skipCurrentQuest()}
        onExit={() => focusMode.deactivate()}
        onCompleteQuest={(qid) => { const pq = quests.find(q => q.id === qid); if (pq && !pq.completed) toggleQuest(qid); }}
      />

      <WeeklyPlanningModal
        open={weekly.showModal}
        onOpenChange={weekly.setShowModal}
        summary={weekly.summary}
        initialPriorities={weekly.autoPriorities}
        initialAllocation={weekly.defaultAllocation}
        onLock={(p, a) => { weekly.lockPlan(p, a); toast({ title: 'Sprint plan locked.', duration: 2000 }); }}
        onDismiss={weekly.dismiss}
        isAutoView={weekly.trigger === 'thursday-fallback' && !weekly.plan?.locked}
        onApprove={() => { weekly.autoLockPlan(); toast({ title: 'Auto-plan approved.', duration: 1500 }); }}
      />

      <div className="min-h-screen bg-background" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <StatusStrip rank={player.title} level={player.level} currentXP={player.currentXP} xpToNextLevel={player.xpToNextLevel} streak={player.streak} />

        <div className="mx-auto max-w-md space-y-3 px-4 pt-2">
          {emergency.hasActiveEmergency && emergency.activeEmergency && (
            <EmergencyQuestBanner quest={emergency.activeEmergency} onCompleteObjective={emergency.completeObjective} />
          )}

          {heroItem && (
            <HeroCard
              item={heroItem}
              onAction={heroItem.action ? () => handleFeedAction(heroItem.action!.handler) : undefined}
              onDismiss={() => dismissFeedItem(heroItem.id)}
            />
          )}

          <MissionBatch
            missions={legacyMissions}
            onToggle={handleMissionToggle}
            completedCount={completedMissions}
            totalCount={totalMissions}
          />

          {visibleFeed.length > 0 && (
            <div className="rounded-lg border border-border/30 bg-card/20 px-3">
              <p className="font-mono text-[8px] tracking-[0.2em] text-muted-foreground/50 uppercase pt-3 pb-1">
                SYSTEM FEED
              </p>
              {visibleFeed.slice(0, 6).map(item => (
                <SystemFeedCard
                  key={item.id}
                  item={item}
                  onAction={item.action ? () => handleFeedAction(item.action!.handler) : undefined}
                  onDismiss={() => dismissFeedItem(item.id)}
                />
              ))}
              {visibleFeed.length > 6 && (
                <p className="font-mono text-[9px] text-muted-foreground/40 text-center py-2">
                  +{visibleFeed.length - 6} more
                </p>
              )}
            </div>
          )}

          {questChains.activeChains.length < 2 && (
            <button
              onClick={() => setChainModalOpen(true)}
              className="w-full py-2 rounded-md border border-dashed border-border/30 font-mono text-[10px] tracking-wider text-muted-foreground/50 uppercase hover:border-primary/30 hover:text-primary transition-colors"
            >
              + Initiate Quest Chain
            </button>
          )}
        </div>

        <BottomNav />
        <CaptureFAB />
      </div>

      <ChainStartModal
        open={chainModalOpen}
        onOpenChange={setChainModalOpen}
        onStart={async (idx) => {
          const chain = await questChains.startChain(idx);
          if (chain) {
            toast({ title: 'CHAIN INITIATED', description: `"${chain.title}" — ${chain.totalSteps} steps.`, duration: 3000 });
          }
        }}
        activeChainCount={questChains.activeChains.length}
      />
    </>
  );
};

export default Index;
