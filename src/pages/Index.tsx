import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TopBar } from '@/components/dashboard/TopBar';
import { SystemIntelligencePanel, SystemIntelligenceLoading } from '@/components/dashboard/SystemIntelligencePanel';
import { ShadowArmyPanel } from '@/components/shadows/ShadowArmyPanel';
import { DungeonPanel } from '@/components/dungeons/DungeonPanel';
import { useSystemIntelligenceAI } from '@/hooks/useSystemIntelligenceAI';
import { DashboardMessage } from '@/components/dashboard/DashboardMessage';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { DashboardActions } from '@/components/dashboard/DashboardActions';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import StateCheck from '@/components/StateCheck';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { AriseOverlay } from '@/components/effects/AriseOverlay';
import { RankUpOverlay } from '@/components/effects/RankUpOverlay';
import { SkillUnlockOverlay } from '@/components/effects/SkillUnlockOverlay';
import { PenaltyDungeonOverlay } from '@/components/effects/PenaltyDungeonOverlay';
import { StatusWindow } from '@/components/dashboard/StatusWindow';
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
import { usePillarQuests } from '@/hooks/usePillarQuests';
import { usePillarStreak } from '@/hooks/usePillarStreak';
import { useSystemNotifications } from '@/hooks/useSystemNotifications';
import { useShadowArmy } from '@/hooks/useShadowArmy';
import { useDungeons } from '@/hooks/useDungeons';
import { SuggestedShadow, SuggestedDungeon } from '@/types/systemIntelligence';
import { SystemChatPanel } from '@/components/chat/SystemChatPanel';
import { ShadowCategory } from '@/types/shadowArmy';
import { DungeonObjective } from '@/types/dungeon';
import { useSkills } from '@/hooks/useSkills';
import { usePenaltyDungeon } from '@/hooks/usePenaltyDungeon';
import { getRankForLevel } from '@/types/skills';
import { getSystemDate } from '@/utils/dayCycleEngine';
import { loadAIQuests, isAIEnabled } from '@/utils/aiQuestGenerator';
import { useTrainingLog } from '@/hooks/useTrainingLog';
import { buildTrainingContext } from '@/hooks/useTrainingIntelligence';
import { getMesocycleState } from '@/utils/periodizationEngine';
import { useSystemInterventions } from '@/hooks/useSystemInterventions';
import { SystemInterventionBanner } from '@/components/dashboard/SystemInterventionBanner';
import { InterventionContext } from '@/utils/interventionEngine';
const LAST_SCAN_DATE_KEY = 'systemLastScanDate';
const AI_SETTINGS_KEY = 'systemAISettings';
const START_DATE_KEY = 'systemStartDate';

function isAutoDeployEnabled(): boolean {
  try {
    const settings = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}');
    return settings.autoDeploy === true;
  } catch { return false; }
}

function needsDailyScan(): boolean {
  const today = getSystemDate();
  return localStorage.getItem(LAST_SCAN_DATE_KEY) !== today;
}

function markScanDone() {
  localStorage.setItem(LAST_SCAN_DATE_KEY, getSystemDate());
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
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState, setGoal, addXP, reduceStat, resetPenaltyDays } = usePlayer();
  const { logCaffeine, hasLoggedAfter10am, warningDismissed, dismissWarning, logs } = useCaffeine();
  const { toggleQuest, setQuestCompleted, quests } = useProtocolQuests();
  const { workout, workoutCompleted, prescription: workoutPrescription, trainingLevel: wTrainingLevel, sessionsLogged: wSessionsLogged, todayWorkoutType } = useWorkout();
  const { recentLogs, personalRecords, fatigueAccumulation } = useTrainingLog();
  const { toast } = useToast();
  const { strategy, dayNumber, playerTitle } = useSystemStrategy();
  const { intelligence, loading: aiLoading, error: aiError, generate: generateIntelligence } = useSystemIntelligenceAI();
  const { logColdExposure } = useGeneticState();
  const weekly = useWeeklyPlanning();
  const focusMode = useFocusModeContext();
  const pillar = usePillarQuests();
  const pillarStreak = usePillarStreak();
  const { notifications, unreadCount, addNotification, markAllRead, clearAll: clearNotifications } = useSystemNotifications();
  const { shadows, addShadow: _addShadow } = useShadowArmy();
  const { completedDungeons, createDungeon: _createDungeon } = useDungeons();

  // ── Intervention Engine (JARVIS) ─────────────────────────────
  const buildInterventionContext = useCallback((): InterventionContext => {
    const now = new Date();
    const completedQ = quests.filter(q => q.completed).length;
    const totalXPToday = quests
      .filter(q => q.completed)
      .reduce((sum, q) => sum + q.xp + (q.geneticBonus?.bonusXp || 0), 0);

    let lastQuestMinAgo = 999;
    try {
      const raw = localStorage.getItem('systemCalibratedCompletions');
      if (raw) {
        const history = JSON.parse(raw);
        const today = getSystemDate();
        const todayCompletions = history.filter((c: any) => c.completedAt?.startsWith(today));
        if (todayCompletions.length > 0) {
          const lastTime = new Date(todayCompletions[todayCompletions.length - 1].completedAt);
          lastQuestMinAgo = Math.round((now.getTime() - lastTime.getTime()) / 60_000);
        }
      }
    } catch { /* ignore */ }

    let daysSinceLastShadow = 30;
    try {
      if (shadows.length > 0) {
        const latest = shadows.reduce((a, b) => 
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        );
        daysSinceLastShadow = Math.round(
          (now.getTime() - new Date(latest.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    } catch { /* ignore */ }

    let weeklyPlanDone = false;
    try {
      const raw = localStorage.getItem('systemWeeklyPlan');
      if (raw) {
        const plan = JSON.parse(raw);
        weeklyPlanDone = plan?.locked === true;
      }
    } catch { /* ignore */ }

    const hour = now.getHours();
    let geneticPhase = 'stable';
    if (hour >= 8 && hour < 12) geneticPhase = 'peak';
    else if (hour >= 14 && hour < 17) geneticPhase = 'dip';
    else if (hour >= 17) geneticPhase = 'recovery';

    return {
      currentHour: hour,
      geneticPhase,
      questsCompletedToday: completedQ,
      questsTotalToday: quests.length,
      xpEarnedToday: totalXPToday,
      averageDailyXP: 150,
      streak: player.streak,
      lastCaffeineTime: logs.length > 0 ? logs[logs.length - 1] : null,
      caffeineWarningShownToday: warningDismissed,
      fatigueAccumulation,
      workoutScheduledToday: !!todayWorkoutType,
      dayOfWeek: now.getDay(),
      weeklyPlanCompleted: weeklyPlanDone,
      daysSinceLastShadowActivation: daysSinceLastShadow,
      lastQuestCompletedMinutesAgo: lastQuestMinAgo,
      trainingCompleted: workoutCompleted,
      sprintsToday: 0,
    };
  }, [quests, player.streak, logs, warningDismissed, fatigueAccumulation, todayWorkoutType, shadows, workoutCompleted]);

  const { interventions: activeInterventions, highestPriority, dismissIntervention } = useSystemInterventions({
    buildContext: buildInterventionContext,
    enabled: true,
  });

  // Auto-deploy: track which suggestions have been auto-deployed this session
  const autoDeployedRef = useRef<Set<string>>(new Set());

  // Auto-deploy shadows & dungeons when intelligence loads and toggle is on
  useEffect(() => {
    if (!intelligence || !isAutoDeployEnabled()) return;

    const deployShadows = async () => {
      for (const shadow of intelligence.suggestedShadows || []) {
        const key = `shadow:${shadow.name}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);

        const result = await _addShadow(shadow.name, shadow.category as ShadowCategory, shadow.description);
        if (result?.data) {
          setAriseState({ show: true, name: shadow.name });
          addNotification('shadow_extracted', 'Shadow Auto-Deployed', `"${shadow.name}" extracted by System Intelligence: ${shadow.reasoning}`, { shadowName: shadow.name, autoDeploy: true });
        }
      }
    };

    const deployDungeons = async () => {
      for (const dungeon of intelligence.suggestedDungeons || []) {
        const key = `dungeon:${dungeon.title}`;
        if (autoDeployedRef.current.has(key)) continue;
        autoDeployedRef.current.add(key);

        const objectives: DungeonObjective[] = dungeon.objectives.map((title, i) => ({
          id: `obj-${i}`,
          title,
          completed: false,
        }));
        const timeLimitMinutes = dungeon.type === 'instant_dungeon' ? 45 : null;
        const expiresAt = dungeon.type === 'boss_fight'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : timeLimitMinutes
            ? new Date(Date.now() + timeLimitMinutes * 60 * 1000).toISOString()
            : null;

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data } = await supabase
          .from('dungeons')
          .insert({
            user_id: userData.user.id,
            dungeon_type: dungeon.type,
            title: dungeon.title,
            description: dungeon.description,
            difficulty: dungeon.difficulty,
            xp_reward: dungeon.xpReward,
            time_limit_minutes: timeLimitMinutes,
            objectives: objectives as any,
            status: 'available',
            expires_at: expiresAt,
          })
          .select()
          .single();

        if (data) {
          addNotification('dungeon_cleared', 'Dungeon Auto-Deployed', `"${dungeon.title}" materialized by System Intelligence.`, { dungeonTitle: dungeon.title, autoDeploy: true });
        }
      }
    };

    deployShadows();
    deployDungeons();
  }, [intelligence]);

  // Skills system
  const skillCtx = useMemo(() => ({
    player,
    shadowCount: shadows.length,
    dungeonClears: completedDungeons.length,
    pillarStreak: pillarStreak.streak,
  }), [player, shadows.length, completedDungeons.length, pillarStreak.streak]);
  const { unlockedSkills, newlyUnlocked, dismissNewSkill } = useSkills(skillCtx);

  // Penalty dungeon system
  const penaltyDungeon = usePenaltyDungeon({
    player,
    onStatReduction: reduceStat,
    onXPGained: addXP,
    onPenaltyCleared: resetPenaltyDays,
    addNotification,
  });

  // ARISE overlay state
  const [ariseState, setAriseState] = useState<{ show: boolean; name: string }>({ show: false, name: '' });
  // Status Window state
  const [statusWindowOpen, setStatusWindowOpen] = useState(false);
  // Rank system
  const [rankUpState, setRankUpState] = useState<{ show: boolean; rank: string }>({ show: false, rank: '' });
  const prevRankRef = useRef(player.title);
  // Detect if pillars were missed yesterday (for dimming + silent brief)
  const pillarsMissedYesterday = useMemo(() => {
    if (pillarStreak.streak > 0) return false; // streak is alive
    if (pillarStreak.hasCompletedToday) return false;
    // If lastCompletedDate exists but isn't today or yesterday, pillars were missed
    return !pillarStreak.hasCompletedToday && pillarStreak.streak === 0;
  }, [pillarStreak]);

  const pillarArcs = useMemo(() => [
    { pillar: 'mind' as const, completed: pillar.quests.filter(q => q.pillar === 'mind').every(q => pillar.isCompleted(q.id)) },
    { pillar: 'body' as const, completed: pillar.quests.filter(q => q.pillar === 'body').every(q => pillar.isCompleted(q.id)) },
    { pillar: 'skill' as const, completed: pillar.quests.filter(q => q.pillar === 'skill').every(q => pillar.isCompleted(q.id)) },
  ], [pillar]);

  const [goalInput, setGoalInput] = useState('');
  const [goalDismissed, setGoalDismissed] = useState(false);

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
      const today = getSystemDate();
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
      if (pc.date === getSystemDate() && pc.accepted) {
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
      const xp = protocolQuest.xp + (protocolQuest.geneticBonus?.bonusXp || 0);
      addXP(xp);
      toggleQuest(q.id);
    }
    focus.completeCurrentQuest();

    // Roll for loot drop
    const stat = protocolQuest?.stat ?? 'discipline';
    rollForLoot(stat, player.streak);
  }, [focus, quests, toggleQuest, addXP, rollForLoot, player.streak]);

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

  // Auto-trigger scan on first daily load or when returning from background
  useEffect(() => {
    const checkScan = () => {
      if (needsDailyScan() && !forceFirstScan) {
        toast(getSystemToast('stateScanRequired'));
        setTimeout(() => setScanOpen(true), 800);
      }
    };

    if (!autoScanRef.current) {
      autoScanRef.current = true;
      checkScan();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkScan();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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

  const handleForceRefresh = useCallback(() => {
    // Clear the daily scan flag so it re-triggers
    localStorage.removeItem(LAST_SCAN_DATE_KEY);
    // Reload the page to force all hooks to re-initialize with fresh date checks
    window.location.reload();
  }, []);

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

  // Log level-ups to system notifications
  const prevLevelRef = useRef(player.level);
  useEffect(() => {
    if (player.level > prevLevelRef.current) {
      addNotification('level_up', `Level ${player.level} Reached`, `You have ascended to Level ${player.level}. The System acknowledges your growth.`, { level: player.level });
    }
    prevLevelRef.current = player.level;
  }, [player.level, addNotification]);

  // Log streak milestones
  const prevStreakRef = useRef(player.streak);
  useEffect(() => {
    if (player.streak > prevStreakRef.current && [3, 7, 14, 30].includes(player.streak)) {
      addNotification('streak_milestone', `${player.streak}-Day Streak`, `Consecutive completion streak: ${player.streak} days. Discipline compounds.`, { streak: player.streak });
    }
    prevStreakRef.current = player.streak;
  }, [player.streak, addNotification]);

  // Rank-up detection
  useEffect(() => {
    const expectedRank = getRankForLevel(player.level);
    if (expectedRank !== prevRankRef.current) {
      setRankUpState({ show: true, rank: expectedRank });
      addNotification('rank_up', `Rank: ${expectedRank}`, `You have been promoted to ${expectedRank}. Your authority grows.`, { rank: expectedRank });
      prevRankRef.current = expectedRank;
    }
  }, [player.level, addNotification]);

  // Log skill unlocks
  useEffect(() => {
    if (newlyUnlocked) {
      addNotification('pattern_detected', `Skill Acquired: ${newlyUnlocked.name}`, `${newlyUnlocked.icon} ${newlyUnlocked.effect}`, { skillId: newlyUnlocked.id });
    }
  }, [newlyUnlocked, addNotification]);

  const currentPersuasion = focus.currentQuest
    ? persuasionMap.get(focus.currentQuest.id) ?? null
    : null;

  const buildChatContext = useCallback(() => {
    const stored = localStorage.getItem(START_DATE_KEY);
    const todayStr = getSystemDate();
    let dn = 1;
    if (stored) {
      const startMs = new Date(stored + 'T12:00:00').getTime();
      const todayMs = new Date(todayStr + 'T12:00:00').getTime();
      dn = Math.max(1, Math.round((todayMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
    }
    const now = new Date();
    const dow = now.getDay();
    return {
      level: player.level,
      currentXP: player.currentXP,
      xpToNextLevel: player.xpToNextLevel,
      totalXP: player.totalXP ?? 0,
      streak: player.streak,
      coldStreak: player.coldStreak ?? 0,
      stats: player.stats,
      goal: player.goal || null,
      dayNumber: dn,
      systemMode: systemRec,
      currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dayType: dow >= 4 ? 'Sprint Day' : 'Work Day',
      questsCompletedToday: completedQuests,
      questsTotalToday: quests.length,
      shadowCount: shadows.length,
      forceMultiplier: shadows.filter(s => s.status === 'active').length > 0
        ? +(1 + shadows.filter(s => s.status === 'active').reduce((s, sh) => s + sh.contribution_score, 0) / 100).toFixed(1)
        : 1,
      dungeonsCleared: completedDungeons.length,
      activeInterventions: activeInterventions.map(i => ({
        priority: i.priority,
        title: i.title,
        message: i.message,
        type: i.type,
      })),
      training: buildTrainingContext({
        recentLogs,
        personalRecords,
        fatigueAccumulation,
        mesocycleWeek: getMesocycleState().currentWeek,
        mesocycleLength: getMesocycleState().totalWeeks,
        todayWorkoutType,
        prescribedIntensity: workoutPrescription?.prescribedIntensity ?? null,
        trainingLevel: wTrainingLevel,
        sessionsLogged: wSessionsLogged,
      }),
    };
  }, [player, systemRec, completedQuests, quests.length, shadows, completedDungeons.length, recentLogs, personalRecords, fatigueAccumulation, todayWorkoutType, workoutPrescription, wTrainingLevel, wSessionsLogged, activeInterventions]);

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <RankUpOverlay show={rankUpState.show} newRank={rankUpState.rank} onDone={() => setRankUpState({ show: false, rank: '' })} />
      <SkillUnlockOverlay skill={newlyUnlocked} onDone={dismissNewSkill} />
      <AriseOverlay show={ariseState.show} shadowName={ariseState.name} onDone={() => setAriseState({ show: false, name: '' })} />
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
      <StatusWindow
        open={statusWindowOpen}
        onOpenChange={setStatusWindowOpen}
        player={player}
        shadows={shadows}
        dungeonClears={completedDungeons.length}
        skills={unlockedSkills}
      />
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

      <div className="min-h-screen bg-background" style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* 1. Top Bar */}
        <TopBar
          systemRecommendation={systemRec}
          onForceRefresh={handleForceRefresh}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationsOpen={markAllRead}
          onNotificationsClear={clearNotifications}
        />

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

          {/* Goal capture for existing users */}
          {!player.goal && !goalDismissed && (
            <div className="rounded-lg border border-primary/30 bg-card/80 p-4 space-y-3">
              <p className="font-mono text-[10px] tracking-widest text-primary uppercase">System Calibration Required</p>
              <p className="font-mono text-xs text-muted-foreground">What are you building toward? One sentence.</p>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g., Build my consultancy to $10K MRR"
                maxLength={120}
                className="w-full rounded-md border border-border bg-background/50 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && goalInput.trim()) { setGoal(goalInput.trim()); } }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { if (goalInput.trim()) setGoal(goalInput.trim()); }}
                  disabled={!goalInput.trim()}
                  className={`flex-1 py-2 rounded-md font-mono text-[10px] tracking-wider transition-all ${
                    goalInput.trim() ? 'border border-primary/50 bg-primary/10 text-primary' : 'border border-border text-muted-foreground/40'
                  }`}
                >
                  CONFIRM
                </button>
                <button
                  onClick={() => setGoalDismissed(true)}
                  className="py-2 px-3 rounded-md font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {/* 2. System Message — uses AI brief when available */}
          <DashboardMessage message={
            pillarsMissedYesterday ? '…'
              : intelligence?.dailyBrief
              ? intelligence.dailyBrief
              : (() => {
                  const ai = loadAIQuests();
                  if (ai && isAIEnabled() && ai.generatedAt?.startsWith(getSystemDate())) {
                    return ai.systemMessage;
                  }
                  return oneLiner;
                })()
          } />

          {/* 2b. System Intelligence Panel */}
          {aiLoading && !intelligence && <SystemIntelligenceLoading />}
          {intelligence && (
            <SystemIntelligencePanel
              intelligence={intelligence}
              loading={aiLoading}
              error={aiError}
              onGenerate={generateIntelligence}
              onCompleteChallenge={(id) => {
                const challenge = intelligence.dynamicChallenges.find(c => c.id === id);
                if (challenge) addXP(challenge.xpReward);
              }}
              onAcceptShadow={async (shadow: SuggestedShadow) => {
                const result = await _addShadow(shadow.name, shadow.category as ShadowCategory, shadow.description);
                if (result?.data) {
                  setAriseState({ show: true, name: shadow.name });
                  addNotification('shadow_extracted', 'Shadow Recruited', `"${shadow.name}" extracted on System recommendation: ${shadow.reasoning}`, { shadowName: shadow.name });
                }
              }}
              onAcceptDungeon={async (dungeon: SuggestedDungeon) => {
                const objectives: DungeonObjective[] = dungeon.objectives.map((title, i) => ({
                  id: `obj-${i}`,
                  title,
                  completed: false,
                }));
                const timeLimitMinutes = dungeon.type === 'instant_dungeon' ? 45 : null;
                const expiresAt = dungeon.type === 'boss_fight'
                  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                  : timeLimitMinutes
                    ? new Date(Date.now() + timeLimitMinutes * 60 * 1000).toISOString()
                    : null;

                const { data: userData } = await supabase.auth.getUser();
                if (!userData.user) return;

                const { data, error: dbErr } = await supabase
                  .from('dungeons')
                  .insert({
                    user_id: userData.user.id,
                    dungeon_type: dungeon.type,
                    title: dungeon.title,
                    description: dungeon.description,
                    difficulty: dungeon.difficulty,
                    xp_reward: dungeon.xpReward,
                    time_limit_minutes: timeLimitMinutes,
                    objectives: objectives as any,
                    status: 'available',
                    expires_at: expiresAt,
                  })
                  .select()
                  .single();

                if (data && !dbErr) {
                  addNotification('dungeon_cleared', 'Dungeon Gate Opened', `"${dungeon.title}" materialized. ${dungeon.reasoning}`, { dungeonTitle: dungeon.title });
                }
              }}
            />
          )}

          {/* 2c. Shadow Army */}
          <ShadowArmyPanel onShadowAdded={(name) => {
            setAriseState({ show: true, name });
            addNotification('shadow_extracted', 'Shadow Extracted', `"${name}" has been extracted and joined your Shadow Army.`, { shadowName: name });
          }} />

          {/* 2d. Dungeons */}
          <DungeonPanel onXPGained={(xp) => {
            addXP(xp);
            addNotification('dungeon_cleared', 'Dungeon Cleared', `Dungeon completed. ${xp} XP claimed.`, { xp });
          }} />

          {/* 3. Progress Ring */}
          <button onClick={() => setStatusWindowOpen(true)} className="w-full">
            <ProgressRing
              progress={strategy.shadowMonarchProgress}
              title={playerTitle}
              currentXP={player.currentXP}
              xpToNextLevel={player.xpToNextLevel}
              level={player.level}
              pillarArcs={pillarArcs}
              dimmed={pillarsMissedYesterday && !pillar.completedCount}
            />
          </button>

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

      {/* System Chat Interface */}
      <SystemChatPanel buildContext={buildChatContext} />
    </>
  );
};

export default Index;
