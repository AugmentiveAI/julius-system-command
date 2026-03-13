import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatusStrip } from '@/components/dashboard/StatusStrip';
import { SystemMessageCard, SystemMessage } from '@/components/dashboard/SystemMessageCard';
import { MissionCard } from '@/components/quests/MissionCard';
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
import { usePenaltyDungeon } from '@/hooks/usePenaltyDungeon';
import { usePreCommitment } from '@/hooks/usePreCommitment';
import { useWeeklyPlanning } from '@/hooks/useWeeklyPlanning';
import { useFocusModeContext } from '@/contexts/FocusModeContext';
import { useFocusMode } from '@/hooks/useFocusMode';
import { useTrainingLog } from '@/hooks/useTrainingLog';
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
import { LootCinematicReveal } from '@/components/effects/LootCinematicReveal';
import { FocusModeOverlay } from '@/components/focus/FocusModeOverlay';
import StateCheck from '@/components/StateCheck';
import { StatusWindow } from '@/components/dashboard/StatusWindow';
import { PenaltyDungeonOverlay } from '@/components/effects/PenaltyDungeonOverlay';
import { EmergencyQuestBanner } from '@/components/quests/EmergencyQuestBanner';
import { AARModal } from '@/components/aar/AARModal';
import { WeeklyPlanningModal } from '@/components/planning/WeeklyPlanningModal';
import { ActiveBoostsBar } from '@/components/dashboard/ActiveBoostsBar';

import { useJarvisBrainOptional } from '@/contexts/JarvisBrainContext';
import { reorderQuestsWithJarvis } from '@/utils/jarvisQuestReorder';
import { QuestTimeBlock } from '@/types/quests';
import { buildTrainingContext } from '@/hooks/useTrainingIntelligence';
import { getMesocycleState } from '@/utils/periodizationEngine';
import CaptureFAB from '@/components/capture/CaptureFAB';

// TODO: Phase2-IP-rebrand — "Shadow Monarch", "Hunter" terminology, rank aesthetic

const LAST_SCAN_DATE_KEY = 'systemLastScanDate';
const STATE_HISTORY_KEY = 'systemStateHistory';
const CALIBRATED_COMPLETIONS_KEY = 'systemCalibratedCompletions';
const START_DATE_KEY = 'systemStartDate';

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
        const objectives: DungeonObjective[] = dungeon.objectives.map((title, i) => ({ id: `obj-${i}`, title, completed: false }));
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

  const [ariseState, setAriseState] = useState({ show: false, name: '' });
  const [statusWindowOpen, setStatusWindowOpen] = useState(false);
  const [rankUpState, setRankUpState] = useState({ show: false, rank: '' });
  const prevRankRef = useRef(player.title);
  const [scanOpen, setScanOpen] = useState(false);
  const autoScanRef = useRef(false);
  const [todayCheck, setTodayCheck] = useState<PlayerStateCheck | null>(getLatestTodayCheck);

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

  // Reorder quests with JARVIS brain
  const allMissions = useMemo(() => {
    const missions: Array<{
      id: string; title: string; xp: number; completed: boolean;
      type: 'protocol' | 'calibrated' | 'pillar' | 'shadow' | 'emergency';
      badge?: { label: string; color: string } | null;
      borderGlow?: string | null;
      persuasionMessage?: string | null;
      description?: string; timeBlock?: string;
    }> = [];

    // Protocol quests
    quests.forEach(q => {
      const totalXp = q.xp + (q.geneticBonus?.bonusXp || 0);
      missions.push({
        id: q.id, title: q.title, xp: totalXp, completed: q.completed,
        type: 'protocol',
        badge: q.isRehab ? { label: 'RECOVERY', color: 'text-green-400 border-green-500/30 bg-green-500/10' } : null,
        timeBlock: q.timeBlock,
      });
    });

    // Calibrated quests
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

    // Pillar quests
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

    // Shadow quest
    if (shadowQuest && shadowRevealed) {
      missions.push({
        id: shadowQuest.id, title: shadowQuest.title, xp: shadowQuest.rewardXP,
        completed: shadowQuest.completed, type: 'shadow',
        badge: { label: 'SHADOW INTEL', color: 'text-secondary border-secondary/30 bg-secondary/10' },
      });
    }

    return missions;
  }, [quests, calibration, pillar, shadowQuest, shadowRevealed, completedCalibratedIds, persuasionMap, jarvis]);

  // Build system messages for the card
  const systemMessages = useMemo<SystemMessage[]>(() => {
    const msgs: SystemMessage[] = [];

    // Highest priority intervention
    if (highestPriority) {
      msgs.push({ id: 'intervention', text: highestPriority.message, priority: highestPriority.priority === 'critical' ? 'critical' : highestPriority.priority === 'high' ? 'warning' : 'insight' });
    }

    // Cornerstone alert
    if (cornerstone && !todayHonored) {
      msgs.push({ id: 'cornerstone', text: `Cornerstone unprotected: "${cornerstone.behavior}". History predicts low-output day.`, priority: 'warning' });
    }

    // Intelligence daily brief
    if (intelligence?.dailyBrief) {
      msgs.push({ id: 'brief', text: intelligence.dailyBrief, priority: 'insight' });
    } else {
      const firstSentence = strategy.dailyBrief.split(/[.!]/).filter(Boolean)[0]?.trim();
      if (firstSentence) msgs.push({ id: 'brief', text: firstSentence + '.', priority: 'insight' });
    }

    // Loop detected
    if (newLoopDetected) {
      msgs.push({ id: 'loop', text: `Pattern detected: ${newLoopDetected.pattern}. ${newLoopDetected.breakStrategy || 'Analyze and adapt.'}`, priority: 'warning' });
    }

    // Penalty
    if (penaltyLevel >= 2) {
      msgs.push({ id: 'penalty', text: `Penalty level ${penaltyLevel}. Zero-day streak active. Complete any mission to halt decay.`, priority: 'critical' });
    }

    if (msgs.length === 0) {
      msgs.push({ id: 'default', text: 'THE SYSTEM awaits. Begin your missions.', priority: 'insight' });
    }

    return msgs;
  }, [highestPriority, cornerstone, todayHonored, intelligence, strategy, newLoopDetected, penaltyLevel]);

  // Handlers
  const handleMissionToggle = useCallback((id: string) => {
    // Check which type it is
    const protocolQuest = quests.find(q => q.id === id);
    if (protocolQuest) {
      if (!protocolQuest.completed) {
        const xp = protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0);
        addCompletion({ questId: id, questTitle: protocolQuest.title, xpEarned: xp, completedAt: new Date().toISOString(), type: 'daily' });
        addXP(xp);
        rollForLoot(protocolQuest.stat, player.streak);
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
      }
      pillar.toggleQuest(pillarId);

      // Check pillar mastery
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

    // Calibrated quest
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
          }
          return next;
        });
      }
    }
  }, [quests, toggleQuest, addXP, addCompletion, pillar, pillarStreak, shadowQuest, completeShadow, calibration, persuasionMap, rollForLoot, player, onCalibratedQuestCompleted, toast]);

  // Auto-scan
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

  // Achievement tracking
  const achievementRef = useRef({ morning: false, allDaily: false });
  useEffect(() => {
    const morningQuests = quests.filter(q => q.timeBlock === 'morning');
    const allMorningDone = morningQuests.length > 0 && morningQuests.every(q => q.completed);
    if (allMorningDone && !achievementRef.current.morning) { achievementRef.current.morning = true; toast(getSystemToast('morningProtocol')); }
    if (!allMorningDone) achievementRef.current.morning = false;
  }, [quests, toast]);

  // All missions complete check
  const totalMissions = allMissions.length;
  const completedMissions = allMissions.filter(m => m.completed).length;
  const allComplete = totalMissions > 0 && completedMissions >= totalMissions;
  const [showAllComplete, setShowAllComplete] = useState(false);

  useEffect(() => {
    if (allComplete && !achievementRef.current.allDaily) {
      achievementRef.current.allDaily = true;
      setShowAllComplete(true);
      toast(getSystemToast('allQuestsComplete'));
      setTimeout(() => setShowAllComplete(false), 2000);
    }
    if (!allComplete) achievementRef.current.allDaily = false;
  }, [allComplete, toast]);

  // Rank-up detection
  useEffect(() => {
    const expectedRank = getRankForLevel(player.level);
    if (expectedRank !== prevRankRef.current) {
      setRankUpState({ show: true, rank: expectedRank });
      addNotification('rank_up', `Rank: ${expectedRank}`, `Promoted to ${expectedRank}.`, { rank: expectedRank });
      prevRankRef.current = expectedRank;
    }
  }, [player.level, addNotification]);

  // Active boosts
  const hasActiveBoosts = useMemo(() => {
    try { const inv = JSON.parse(localStorage.getItem('the-system-store-inventory') || '[]'); return inv.some((i: any) => i.activeUntil && new Date(i.activeUntil) > new Date()); }
    catch { return false; }
  }, []);

  // Chat context builder
  const buildChatContext = useCallback(() => {
    const stored = localStorage.getItem(START_DATE_KEY);
    const todayStr = getSystemDate();
    let dn = 1;
    if (stored) { dn = Math.max(1, Math.round((new Date(todayStr + 'T12:00:00').getTime() - new Date(stored + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1); }
    return {
      level: player.level, currentXP: player.currentXP, xpToNextLevel: player.xpToNextLevel, totalXP: player.totalXP ?? 0,
      streak: player.streak, coldStreak: player.coldStreak ?? 0, stats: player.stats, goal: player.goal || null,
      dayNumber: dn, systemMode: systemRec,
      questsCompletedToday: completedMissions, questsTotalToday: totalMissions,
      shadowCount: shadows.length, dungeonsCleared: completedDungeons.length,
      training: buildTrainingContext({ recentLogs, personalRecords, fatigueAccumulation, mesocycleWeek: getMesocycleState().currentWeek, mesocycleLength: getMesocycleState().totalWeeks, todayWorkoutType, prescribedIntensity: workoutPrescription?.prescribedIntensity ?? null, trainingLevel: wTrainingLevel, sessionsLogged: wSessionsLogged }),
    };
  }, [player, systemRec, completedMissions, totalMissions, shadows.length, completedDungeons.length, recentLogs, personalRecords, fatigueAccumulation, todayWorkoutType, workoutPrescription, wTrainingLevel, wSessionsLogged]);

  // Focus mode handlers
  const handleFocusComplete = useCallback(() => {
    if (!focus.currentQuest) return;
    const q = focus.currentQuest;
    const protocolQuest = quests.find(pq => pq.id === q.id);
    if (protocolQuest && !protocolQuest.completed) { addXP(protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0)); toggleQuest(q.id); }
    focus.completeCurrentQuest();
    rollForLoot(protocolQuest?.stat ?? 'discipline', player.streak);
  }, [focus, quests, toggleQuest, addXP, rollForLoot, player.streak]);

  const currentPersuasion = focus.currentQuest ? persuasionMap.get(focus.currentQuest.id) ?? null : null;

  return (
    <>
      {/* Overlays — Tier 1 only */}
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <AriseOverlay show={ariseState.show} shadowName={ariseState.name} onDone={() => setAriseState({ show: false, name: '' })} />
      <RankUpOverlay show={rankUpState.show} newRank={rankUpState.rank} onDone={() => setRankUpState({ show: false, rank: '' })} />

      {/* Tier 2 — Toast only for loot */}
      {pendingDrop && <LootDropToast item={pendingDrop.item} show={true} onDone={clearPendingDrop} />}

      {/* Penalty dungeon */}
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
        {/* A. Status Strip */}
        <StatusStrip rank={player.title} level={player.level} currentXP={player.currentXP} xpToNextLevel={player.xpToNextLevel} streak={player.streak} />

        {/* All complete flash */}
        {showAllComplete && (
          <div className="mx-auto max-w-md px-4 py-2">
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-2 text-center animate-pulse">
              <span className="font-mono text-xs font-bold text-green-400 tracking-wider">ALL MISSIONS COMPLETE</span>
            </div>
          </div>
        )}

        {/* Penalty banner — persistent red */}
        {penaltyLevel >= 2 && (
          <div className="mx-auto max-w-md px-4 pt-1">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-center">
              <span className="font-mono text-[10px] text-destructive tracking-wider">
                PENALTY ACTIVE — Level {penaltyLevel}. Complete missions to halt stat decay.
              </span>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-md space-y-3 px-4 pt-2">
          {/* Active boosts — only when active */}
          {hasActiveBoosts && <ActiveBoostsBar />}

          {/* Emergency quest banner */}
          {emergency.hasActiveEmergency && emergency.activeEmergency && (
            <EmergencyQuestBanner quest={emergency.activeEmergency} onCompleteObjective={emergency.completeObjective} />
          )}

          {/* B. THE SYSTEM message */}
          <SystemMessageCard messages={systemMessages} />

          {/* C. Today's Missions — unified list */}
          <div className="space-y-2">
            {allMissions.map(mission => (
              <MissionCard
                key={mission.id}
                id={mission.id}
                title={mission.title}
                xp={mission.xp}
                completed={mission.completed}
                onToggle={handleMissionToggle}
                badge={mission.badge}
                borderGlow={mission.borderGlow}
                persuasionMessage={mission.persuasionMessage}
                description={mission.description}
                timeBlock={mission.timeBlock}
              />
            ))}
          </div>

          {/* Progress indicator */}
          {totalMissions > 0 && (
            <div className="pt-2">
              <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(completedMissions / totalMissions) * 100}%` }}
                />
              </div>
              <p className="text-center font-mono text-[10px] text-muted-foreground mt-1.5">
                {completedMissions} / {totalMissions} missions
              </p>
            </div>
          )}
        </div>

        <BottomNav />
        <CaptureFAB />
      </div>

      
    </>
  );
};

export default Index;
