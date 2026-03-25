import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { useJarvisBrain } from '@/contexts/JarvisBrainContext';
import { useEmergencyQuests } from '@/hooks/useEmergencyQuests';
import { useAfterActionReview } from '@/hooks/useAfterActionReview';
import { useNarrativeLoops } from '@/hooks/useNarrativeLoops';
import { useCornerstone } from '@/hooks/useCornerstone';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { useLootDrops } from '@/hooks/useLootDrops';
import { usePersuasion, recordCompletion } from '@/hooks/usePersuasion';
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
import { useSystemFeed } from '@/hooks/useSystemFeed';
import { calibrateQuests, CalibratedQuest, QuestCompletionRecord } from '@/utils/questCalibration';
import { loadCachedResistance } from '@/utils/resistanceTracker';
import { PlayerStateCheck } from '@/types/playerState';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { loadAIQuests, isAIEnabled } from '@/utils/aiQuestGenerator';
import { getRankForLevel } from '@/types/skills';
import { ShadowCategory } from '@/types/shadowArmy';
import { DungeonObjective } from '@/types/dungeon';
import { SuggestedShadow, SuggestedDungeon } from '@/types/systemIntelligence';
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
import { QuestChainCard } from '@/components/chains/QuestChainCard';
import { ChainStartModal } from '@/components/chains/ChainStartModal';
import { useJarvisBrainOptional } from '@/contexts/JarvisBrainContext';
import { reorderQuestsWithJarvis } from '@/utils/jarvisQuestReorder';
import { QuestTimeBlock } from '@/types/quests';
import CaptureFAB from '@/components/capture/CaptureFAB';

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

function assignTimeBlock(quest: CalibratedQuest): QuestTimeBlock {
  if (quest.isBreak) return 'morning';
  switch (quest.stat) {
    case 'discipline': return quest.id.includes('walk') || quest.id.includes('cold') ? 'morning' : 'evening';
    case 'systems': return quest.id.includes('second-wind') ? 'evening' : 'morning';
    case 'sales': case 'network': return 'midday';
    case 'wealth': return 'evening';
    case 'creative': return 'afternoon';
    default: return 'afternoon';
  }
}

interface IndexProps {
  forceFirstScan?: boolean;
  onScanTriggered?: () => void;
}

const Index = ({ forceFirstScan, onScanTriggered }: IndexProps) => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState, setGoal, addXP, reduceStat, resetPenaltyDays } = usePlayer();
  const { logCaffeine, hasLoggedAfter10am, warningDismissed, dismissWarning } = useCaffeine();
  const { toggleQuest, setQuestCompleted, quests } = useProtocolQuests();
  const { workout, workoutCompleted, prescription: workoutPrescription, trainingLevel: wTrainingLevel, sessionsLogged: wSessionsLogged, todayWorkoutType } = useWorkout();
  const { recentLogs, personalRecords, fatigueAccumulation } = useTrainingLog();
  const { toast } = useToast();
  const { strategy, dayNumber, playerTitle } = useSystemStrategy();
  const { intelligence, loading: aiLoading, generate: generateIntelligence } = useSystemIntelligenceAI();
  const { } = useGeneticState();
  const weekly = useWeeklyPlanning();
  const focusMode = useFocusModeContext();
  const pillar = usePillarQuests();
  const pillarStreak = usePillarStreak();
  const { notifications, unreadCount, addNotification, markAllRead, clearAll: clearNotifications } = useSystemNotifications();
  const { shadows, addShadow: _addShadow } = useShadowArmy();
  const { completedDungeons, createDungeon: _createDungeon } = useDungeons();
  const { addCompletion } = useHistoryContext();
  const { todayCommitment, resolveCommitment } = usePreCommitment();

  const {
    allInterventions: activeInterventions,
    highestPriority,
    dismissIntervention,
    logColdExposure,
    threats,
    overallThreatLevel,
  } = useJarvisBrain();
  const emergency = useEmergencyQuests();
  const aarReview = useAfterActionReview();
  const { newLoopDetected, clearNewLoopAlert } = useNarrativeLoops();
  const { cornerstone, todayHonored } = useCornerstone();
  const jarvis = useJarvisBrainOptional();

  const autoDeployedRef = useRef<Set<string>>(new Set());

  // Auto-deploy shadows & dungeons
  useEffect(() => {
    if (!intelligence) return;
    const isAutoDeployEnabled = (() => {
      try { return JSON.parse(localStorage.getItem('systemAISettings') || '{}').autoDeploy === true; } catch { return false; }
    })();
    if (!isAutoDeployEnabled) return;

    (async () => {
      for (const shadow of intelligence.suggestedShadows || []) {
        const key = `shadow:${shadow.name}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);
        const result = await _addShadow(shadow.name, shadow.category as ShadowCategory, shadow.description);
        if (result?.data) {
          setAriseState({ show: true, name: shadow.name });
          addNotification('shadow_extracted', 'Shadow Auto-Deployed', `"${shadow.name}" extracted by System Intelligence.`, { shadowName: shadow.name });
        }
      }
      for (const dungeon of intelligence.suggestedDungeons || []) {
        const key = `dungeon:${dungeon.title}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);
        const objectives: DungeonObjective[] = dungeon.objectives.map((title: string, i: number) => ({ id: `obj-${i}`, title, completed: false }));
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        await supabase.from('dungeons').insert({
          user_id: userData.user.id,
          dungeon_type: dungeon.type,
          title: dungeon.title,
          description: dungeon.description,
          difficulty: dungeon.difficulty,
          xp_reward: dungeon.xpReward,
          objectives: objectives as any,
          status: 'available',
        });
      }
    })();
  }, [intelligence]);

  const skillCtx = useMemo(() => ({
    player, shadowCount: shadows.length, dungeonClears: completedDungeons.length, pillarStreak: pillarStreak.streak,
  }), [player, shadows.length, completedDungeons.length, pillarStreak.streak]);
  const { unlockedSkills, newlyUnlocked, dismissNewSkill } = useSkills(skillCtx);

  const penaltyDungeon = usePenaltyDungeon({
    player, onStatReduction: reduceStat, onXPGained: addXP, onPenaltyCleared: resetPenaltyDays, addNotification,
  });

  const { recordQuestForMastery, levelUpSkill, dismissLevelUp } = useSkillMastery();
  const questChains = useQuestChains();
  const [chainModalOpen, setChainModalOpen] = useState(false);

  const [ariseState, setAriseState] = useState({ show: false, name: '' });
  const [statusWindowOpen, setStatusWindowOpen] = useState(false);
  const [rankUpState, setRankUpState] = useState({ show: false, rank: '' });
  const prevRankRef = useRef(player.title);
  const [scanOpen, setScanOpen] = useState(false);
  const autoScanRef = useRef(false);
  const [todayCheck, setTodayCheck] = useState<PlayerStateCheck | null>(getLatestTodayCheck);
  const [missionsExpanded, setMissionsExpanded] = useState(false);

  const dailyXP = useDailyXP({
    quests, workoutCompleted, workoutXP: workout.xp, coldStreakDays: player.coldStreak ?? 0,
  });

  // State check data
  const latestStateRaw = localStorage.getItem(STATE_HISTORY_KEY);
  let systemRec: 'push' | 'steady' | 'recover' = 'steady';
  let latestCheck: PlayerStateCheck | null = null;
  try {
    if (latestStateRaw) {
      const history: PlayerStateCheck[] = JSON.parse(latestStateRaw);
      if (history.length > 0) { systemRec = history[history.length - 1].systemRecommendation || 'steady'; latestCheck = history[history.length - 1]; }
    }
  } catch { /* ignore */ }

  const activeCheck = todayCheck || latestCheck;

  // Calibration
  const calibration = useMemo(() => {
    if (!activeCheck) return null;
    return calibrateQuests(activeCheck, getStateHistory(), getCompletionHistory(), new Date());
  }, [activeCheck]);

  const [completedCalibratedIds, setCompletedCalibratedIds] = useState<Set<string>>(() => {
    try {
      const today = getSystemDate();
      return new Set(getCompletionHistory().filter(c => c.completedAt.startsWith(today)).map(c => c.questId));
    } catch { return new Set<string>(); }
  });

  const resistanceData = useMemo(() => loadCachedResistance(), []);
  const persuasionMap = usePersuasion(calibration?.recommendedQuests ?? [], activeCheck ?? null, resistanceData);

  const shadowMode = activeCheck?.systemRecommendation === 'recover' ? 'recovery' as const : activeCheck?.systemRecommendation ?? null;
  const {
    shadowQuest, isRevealed: shadowRevealed,
    onCalibratedQuestCompleted, completeShadow,
  } = useShadowQuest(shadowMode, resistanceData);

  // Focus mode
  const preCommitmentRaw = localStorage.getItem('systemPreCommitment');
  let preCommittedId: string | null = null;
  try {
    if (preCommitmentRaw) { const pc = JSON.parse(preCommitmentRaw); if (pc.date === getSystemDate() && pc.accepted) preCommittedId = pc.questId; }
  } catch { /* ignore */ }

  const focus = useFocusMode(calibration?.recommendedQuests ?? [], completedCalibratedIds, quests, preCommittedId);
  const { pendingDrop, rollForLoot, clearPendingDrop } = useLootDrops();

  // ── Build unified mission list ──
  const allMissions = useMemo(() => {
    const missions: Array<{
      id: string; title: string; xp: number; completed: boolean;
      type: 'protocol' | 'calibrated' | 'pillar' | 'shadow' | 'emergency';
      badge?: { label: string; color: string } | null;
      borderGlow?: string | null;
      persuasionMessage?: string | null;
      description?: string; timeBlock?: string;
    }> = [];

    quests.forEach(q => {
      const totalXp = q.xp + (q.geneticBonus?.bonusXp || 0);
      missions.push({
        id: q.id, title: q.title, xp: totalXp, completed: q.completed,
        type: 'protocol',
        badge: q.isRehab ? { label: 'RECOVERY', color: 'text-green-400 border-green-500/30 bg-green-500/10' } : null,
        timeBlock: q.timeBlock,
      });
    });

    if (calibration) {
      const anticipation = jarvis?.anticipation ?? null;
      const geneticPhase = jarvis?.geneticState?.comtPhase ?? null;
      const reordered = reorderQuestsWithJarvis(calibration.recommendedQuests, anticipation, geneticPhase);
      reordered.forEach(q => {
        const persuasion = persuasionMap.get(q.id);
        missions.push({
          id: q.id, title: q.title, xp: q.adjustedXP, completed: completedCalibratedIds.has(q.id),
          type: 'calibrated',
          persuasionMessage: persuasion?.message ?? null,
          timeBlock: assignTimeBlock(q),
        });
      });
    }

    pillar.quests.forEach(q => {
      const pillarColor = q.pillar === 'mind' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
        : q.pillar === 'body' ? 'text-green-400 border-green-500/30 bg-green-500/10'
        : 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      missions.push({
        id: `pillar-${q.id}`, title: q.title, xp: q.xp, completed: pillar.isCompleted(q.id),
        type: 'pillar',
        badge: { label: q.pillar.toUpperCase(), color: pillarColor },
      });
    });

    if (shadowQuest && shadowRevealed) {
      missions.push({
        id: shadowQuest.id, title: shadowQuest.title, xp: shadowQuest.rewardXP,
        completed: shadowQuest.completed, type: 'shadow',
        badge: { label: 'SHADOW INTEL', color: 'text-secondary border-secondary/30 bg-secondary/10' },
      });
    }

    return missions;
  }, [quests, calibration, pillar, shadowQuest, shadowRevealed, completedCalibratedIds, persuasionMap, jarvis]);

  // ── System Feed ──
  const { heroItem, feedItems } = useSystemFeed({
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
    geneticPhase: jarvis?.geneticState?.comtPhase ?? null,
  });

  // ── Mission toggle handler ──
  const handleMissionToggle = useCallback((id: string) => {
    const protocolQuest = quests.find(q => q.id === id);
    if (protocolQuest) {
      if (!protocolQuest.completed) {
        const xp = protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0);
        addCompletion({ questId: id, questTitle: protocolQuest.title, xpEarned: xp, completedAt: new Date().toISOString(), type: 'daily' });
        addXP(xp);
        rollForLoot(protocolQuest.stat, player.streak);
        recordQuestForMastery(id, protocolQuest.title);
      }
      toggleQuest(id);
      return;
    }

    if (id.startsWith('pillar-')) {
      const pillarId = id.replace('pillar-', '');
      const pq = pillar.quests.find(q => q.id === pillarId);
      if (pq && !pillar.isCompleted(pillarId)) {
        addCompletion({ questId: pq.id, questTitle: pq.title, xpEarned: pq.xp, completedAt: new Date().toISOString(), type: 'daily' });
        addXP(pq.xp);
        rollForLoot(pq.stat, player.streak);
        recordQuestForMastery(pq.id, pq.title);
      }
      pillar.toggleQuest(pillarId);
      const wasCompleted = pillar.isCompleted(pillarId);
      if (!wasCompleted) {
        const othersDone = pillar.quests.filter(q => q.id !== pillarId).every(q => pillar.isCompleted(q.id));
        if (othersDone && !pillarStreak.hasCompletedToday) {
          const bonus = pillarStreak.recordAllPillarsComplete();
          if (bonus > 0) { addXP(bonus); toast(getSystemToast('pillarMastery', { goal: player.goal ?? '' })); }
        }
      }
      return;
    }

    if (shadowQuest && id === shadowQuest.id && !shadowQuest.completed && !shadowQuest.expired) {
      completeShadow();
      addCompletion({ questId: id, questTitle: shadowQuest.title, xpEarned: shadowQuest.rewardXP, completedAt: new Date().toISOString(), type: 'daily' });
      return;
    }

    if (calibration) {
      const quest = calibration.recommendedQuests.find(q => q.id === id);
      if (quest) {
        setCompletedCalibratedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) { next.delete(id); }
          else {
            next.add(id);
            saveCompletionRecord({ questId: id, completedAt: new Date().toISOString(), stat: quest.stat });
            addCompletion({ questId: id, questTitle: quest.title, xpEarned: quest.adjustedXP, completedAt: new Date().toISOString(), type: 'daily' });
            addXP(quest.adjustedXP);
            const persuasion = persuasionMap.get(id);
            recordCompletion(persuasion?.technique ?? null);
            onCalibratedQuestCompleted();
            rollForLoot(quest.stat, player.streak);
            recordQuestForMastery(id, quest.title);
          }
          return next;
        });
      }
    }
  }, [quests, toggleQuest, addXP, addCompletion, pillar, pillarStreak, shadowQuest, completeShadow, calibration, persuasionMap, rollForLoot, player, onCalibratedQuestCompleted, toast, recordQuestForMastery]);

  // ── Auto-scan ──
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

  // Sync effects
  useEffect(() => {
    if (workoutCompleted) setQuestCompleted('scheduled-training', true);
  }, [workoutCompleted, setQuestCompleted]);

  useEffect(() => {
    if (hasLoggedAfter10am) setQuestCompleted('caffeine-cutoff', false);
  }, [hasLoggedAfter10am, setQuestCompleted]);

  // Rank-up detection
  useEffect(() => {
    const expectedRank = getRankForLevel(player.level);
    if (expectedRank !== prevRankRef.current) {
      setRankUpState({ show: true, rank: expectedRank });
      addNotification('rank_up', `Rank: ${expectedRank}`, `Promoted to ${expectedRank}.`, { rank: expectedRank });
      prevRankRef.current = expectedRank;
    }
  }, [player.level, addNotification]);

  // All complete check
  const totalMissions = allMissions.length;
  const completedMissions = allMissions.filter(m => m.completed).length;
  const allComplete = totalMissions > 0 && completedMissions >= totalMissions;
  const achievementRef = useRef({ morning: false, allDaily: false });

  useEffect(() => {
    if (allComplete && !achievementRef.current.allDaily) {
      achievementRef.current.allDaily = true;
      toast(getSystemToast('allQuestsComplete'));
    }
    if (!allComplete) achievementRef.current.allDaily = false;
  }, [allComplete, toast]);

  // Focus mode
  const handleFocusComplete = useCallback(() => {
    if (!focus.currentQuest) return;
    const q = focus.currentQuest;
    const protocolQuest = quests.find(pq => pq.id === q.id);
    if (protocolQuest && !protocolQuest.completed) { addXP(protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0)); toggleQuest(q.id); }
    focus.completeCurrentQuest();
    rollForLoot(protocolQuest?.stat ?? 'discipline', player.streak);
  }, [focus, quests, toggleQuest, addXP, rollForLoot, player.streak]);

  const currentPersuasion = focus.currentQuest ? persuasionMap.get(focus.currentQuest.id) ?? null : null;

  // Feed action handler
  const handleFeedAction = useCallback((handler: string) => {
    if (handler === 'expand_missions') setMissionsExpanded(true);
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

  // Dismissed feed items
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const visibleFeed = feedItems.filter(item => !dismissedIds.has(item.id));

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
        {/* A. Status Strip — calm header */}
        <StatusStrip rank={player.title} level={player.level} currentXP={player.currentXP} xpToNextLevel={player.xpToNextLevel} streak={player.streak} />

        <div className="mx-auto max-w-md space-y-3 px-4 pt-2">
          {/* B. Emergency — only when active */}
          {emergency.hasActiveEmergency && emergency.activeEmergency && (
            <EmergencyQuestBanner quest={emergency.activeEmergency} onCompleteObjective={emergency.completeObjective} />
          )}

          {/* C. Hero Card — the ONE thing the System wants you to know */}
          {heroItem && (
            <HeroCard
              item={heroItem}
              onAction={heroItem.action ? () => handleFeedAction(heroItem.action!.handler) : undefined}
              onDismiss={() => setDismissedIds(prev => new Set([...prev, heroItem.id]))}
            />
          )}

          {/* D. Mission Batch — collapsible, clean */}
          <MissionBatch
            missions={allMissions}
            onToggle={handleMissionToggle}
            completedCount={completedMissions}
            totalCount={totalMissions}
          />

          {/* E. System Feed — everything else the System surfaces */}
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
                  onDismiss={() => setDismissedIds(prev => new Set([...prev, item.id]))}
                />
              ))}
              {visibleFeed.length > 6 && (
                <p className="font-mono text-[9px] text-muted-foreground/40 text-center py-2">
                  +{visibleFeed.length - 6} more
                </p>
              )}
            </div>
          )}

          {/* F. Chain initiation — minimal */}
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
