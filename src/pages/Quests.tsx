import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, ScanLine, Check, Sparkles, Play, Brain, Zap, Target, Shield, ShieldOff, Bot } from 'lucide-react';
import { getSystemDate, getTimeUntilMidnightPST } from '@/utils/dayCycleEngine';
import { BottomNav } from '@/components/navigation/BottomNav';
import StateCheck from '@/components/StateCheck';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { usePersuasion, recordCompletion } from '@/hooks/usePersuasion';
import { usePreCommitment } from '@/hooks/usePreCommitment';
import { QuestTimeBlock, TIME_BLOCK_CONFIG } from '@/types/quests';
import { PlayerStateCheck } from '@/types/playerState';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';
import {
  calibrateQuests,
  CalibrationResult,
  CalibratedQuest,
  QuestCompletionRecord,
} from '@/utils/questCalibration';
import { loadCachedResistance } from '@/utils/resistanceTracker';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useShadowQuest } from '@/hooks/useShadowQuest';
import { ShadowQuestNotification } from '@/components/quests/ShadowQuestNotification';
import { FramingColor } from '@/hooks/usePersuasion';
import { useSprintTimer } from '@/hooks/useSprintTimer';
import { SprintOverlay } from '@/components/quests/SprintOverlay';
import { useGeneticState } from '@/hooks/useGeneticState';
import { useWeeklyPlanning, shouldShowPlanning } from '@/hooks/useWeeklyPlanning';
import { WeeklyPlanningModal } from '@/components/planning/WeeklyPlanningModal';
import { useToast } from '@/hooks/use-toast';
import { getSystemToast } from '@/utils/systemVoice';
import { useWorkout } from '@/hooks/useWorkout';
import { getTrainingRecommendation } from '@/utils/trainingIntelligence';
import { useNavigate } from 'react-router-dom';
import { useSystemCommsContext } from '@/contexts/SystemCommsContext';
import { useLootDrops } from '@/hooks/useLootDrops';
import { LootDropToast } from '@/components/effects/LootDropToast';
import { LootCinematicReveal } from '@/components/effects/LootCinematicReveal';
import { usePillarQuests } from '@/hooks/usePillarQuests';
import { PILLAR_CONFIG, Pillar } from '@/types/pillarQuests';
import { usePlayer } from '@/hooks/usePlayer';
import { usePillarStreak } from '@/hooks/usePillarStreak';
import { PillarConfirmation } from '@/components/quests/PillarConfirmation';
import { useAIQuests } from '@/hooks/useAIQuests';
import { loadAIQuests } from '@/utils/aiQuestGenerator';

// ── Storage helpers ──────────────────────────────────────────────────

const STATE_HISTORY_KEY = 'systemStateHistory';
const CALIBRATED_COMPLETIONS_KEY = 'systemCalibratedCompletions';

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
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
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

function getTimeUntilMidnight(): { hours: number; minutes: number } {
  return getTimeUntilMidnightPST();
}

function assignTimeBlock(quest: CalibratedQuest): QuestTimeBlock {
  if (quest.isBreak) return 'morning';
  switch (quest.stat) {
    case 'discipline':
      if (quest.id.includes('walk') || quest.id.includes('cold') || quest.id.includes('supplement')) return 'morning';
      return 'evening';
    case 'systems':
      if (quest.id.includes('second-wind')) return 'evening';
      return 'morning';
    case 'sales':
    case 'network':
      return 'midday';
    case 'wealth':
      return 'evening';
    case 'creative':
      return 'afternoon';
    default:
      return 'afternoon';
  }
}

// ── Mode config ──────────────────────────────────────────────────────

const MODE_BADGE: Record<string, { label: string; dot: string; text: string }> = {
  push: { label: 'PUSH', dot: 'bg-green-400', text: 'text-green-400' },
  steady: { label: 'STEADY', dot: 'bg-amber-400', text: 'text-amber-400' },
  recover: { label: 'RECOVERY', dot: 'bg-red-400', text: 'text-red-400' },
};

// ── Persuasion color helper ──────────────────────────────────────────

function getPersuasionColor(framing: FramingColor): string {
  switch (framing) {
    case 'loss': return 'text-red-400/80';
    case 'identity': return 'text-foreground/70';
    case 'variable': return 'text-yellow-400/80';
    case 'scarcity': return 'text-primary/80';
    default: return 'text-muted-foreground';
  }
}

// ── Difficulty badge ─────────────────────────────────────────────────

const DiffBadge = ({ d }: { d: QuestDifficulty }) => {
  const c = DIFFICULTY_BADGE_CONFIG[d];
  return (
    <span
      className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-mono font-bold border shrink-0 ${c.className}`}
      style={c.glow ? { boxShadow: c.glow } : undefined}
    >
      {c.label}
    </span>
  );
};

// ── Time block order ─────────────────────────────────────────────────

const TIME_BLOCKS_ORDER: QuestTimeBlock[] = ['morning', 'midday', 'afternoon', 'evening'];

// =====================================================================
// QUESTS PAGE
// =====================================================================

const Quests = () => {
  const { quests: protocolQuests, toggleQuest, getTimeBlockStats, getTotalStats, getQuestsByTimeBlock } =
    useProtocolQuests();
  const { addXP, player } = usePlayer();
  const { addCompletion } = useHistoryContext();
  const { todayCommitment, resolveCommitment } = usePreCommitment();
  const [scanOpen, setScanOpen] = useState(false);
  const [todayCheck, setTodayCheck] = useState<PlayerStateCheck | null>(getLatestTodayCheck);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight);
  const [completedCalibrated, setCompletedCalibrated] = useState<Set<string>>(() => {
    try {
      const today = getSystemDate();
      return new Set(getCompletionHistory().filter(c => c.completedAt.startsWith(today)).map(c => c.questId));
    } catch { return new Set(); }
  });

  // Sprint timer
  const { logSprint, geneticState, sprintsToday } = useGeneticState();
  const sprint = useSprintTimer();
  const weekly = useWeeklyPlanning();
  const { toast } = useToast();
  const { workoutCompleted } = useWorkout();
  const navigate = useNavigate();
  const { pendingDrop, rollForLoot, clearPendingDrop } = useLootDrops();
  const pillar = usePillarQuests();
  const pillarStreak = usePillarStreak();
  const [pillarBonusToast, setPillarBonusToast] = useState<number | null>(null);
  const { aiResult } = useAIQuests();

  // Morning confirmation — require if pillars were previewed last night but not yet confirmed today
  const [pillarsConfirmed, setPillarsConfirmed] = useState(() => {
    try {
      const stored = localStorage.getItem('systemPillarConfirmation');
      if (!stored) return false;
      const data = JSON.parse(stored);
      return data.confirmedDate === getSystemDate();
    } catch { return false; }
  });

  // Check if pre-commitment previewed pillars last night
  const needsPillarConfirmation = useMemo(() => {
    if (pillarsConfirmed) return false;
    try {
      const raw = localStorage.getItem('systemPreCommitment');
      if (!raw) return false;
      const pc = JSON.parse(raw);
      // If there was a pre-commitment accepted yesterday evening, pillars were previewed
      if (pc.accepted && pc.acceptedAt) {
        const acceptDate = new Date(pc.acceptedAt).toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return acceptDate === yesterday.toISOString().split('T')[0];
      }
    } catch { /* ignore */ }
    return false;
  }, [pillarsConfirmed]);

  const handlePillarConfirm = useCallback(() => {
    const today = getSystemDate();
    localStorage.setItem('systemPillarConfirmation', JSON.stringify({ confirmedDate: today }));
    setPillarsConfirmed(true);
    toast({ title: '⚔️ Pillars Confirmed', description: 'The System holds you accountable.', duration: 2000 });
  }, [toast]);

  // Read player streak for loot rolls
  const playerStreak = player.streak;

  // Training recommendation
  const trainingRec = useMemo(() =>
    getTrainingRecommendation(geneticState, sprintsToday, workoutCompleted),
    [geneticState, sprintsToday, workoutCompleted]
  );
  const showTrainingNudge = trainingRec.shouldTrainNow && trainingRec.nudgeMessage && !workoutCompleted;

  // Show planning nudge on Thursday if no plan
  const showPlanningNudge = useMemo(() => {
    const day = new Date().getDay();
    return (day >= 4 && day <= 6) && !weekly.plan?.locked;
  }, [weekly.plan]);

  useEffect(() => {
    const interval = setInterval(() => setTimeUntilReset(getTimeUntilMidnight()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Shield usage toast on load
  const shieldToastShownRef = useRef(false);
  useEffect(() => {
    if (pillarStreak.shieldJustUsed && !shieldToastShownRef.current) {
      shieldToastShownRef.current = true;
      const goal = (() => {
        try {
          const p = JSON.parse(localStorage.getItem('the-system-player') || '{}');
          return p.goal ?? 'becoming who you said you would be';
        } catch { return 'becoming who you said you would be'; }
      })();
      toast(getSystemToast('pillarShieldUsed', { goal }));
      // If shield is now gone, follow up
      if (!pillarStreak.shieldAvailable) {
        setTimeout(() => toast(getSystemToast('pillarShieldBroken', { goal })), 3000);
      }
    }
  }, [pillarStreak.shieldJustUsed, pillarStreak.shieldAvailable, toast]);

  const calibration = useMemo<CalibrationResult | null>(() => {
    const check = todayCheck || (() => {
      // Fallback to latest check from any day
      try {
        const stored = localStorage.getItem(STATE_HISTORY_KEY);
        if (!stored) return null;
        const checks: PlayerStateCheck[] = JSON.parse(stored);
        return checks.length > 0 ? checks[checks.length - 1] : null;
      } catch { return null; }
    })();
    if (!check) return null;
    return calibrateQuests(check, getStateHistory(), getCompletionHistory(), new Date());
  }, [todayCheck]);

  const resistanceData = useMemo(() => loadCachedResistance(), []);

  const shadowMode = todayCheck?.systemRecommendation === 'recover' ? 'recovery' as const : todayCheck?.systemRecommendation ?? null;
  const {
    shadowQuest, isRevealed: shadowRevealed, showNotification: shadowNotification,
    timeRemaining: shadowTimeRemaining, dismissNotification: dismissShadowNotification,
    onCalibratedQuestCompleted, completeShadow,
  } = useShadowQuest(shadowMode, resistanceData);

  const persuasionMap = usePersuasion(
    calibration?.recommendedQuests ?? [], todayCheck, resistanceData,
  );

  const groupedQuests = useMemo(() => {
    if (!calibration) return null;
    const groups: Record<QuestTimeBlock, CalibratedQuest[]> = { morning: [], midday: [], afternoon: [], evening: [] };
    calibration.recommendedQuests.forEach(q => groups[assignTimeBlock(q)].push(q));
    return groups;
  }, [calibration]);

  // Enqueue quest-context comms
  const { enqueue: enqueueComm } = useSystemCommsContext();
  const commsEnqueuedRef = useRef(false);

  useEffect(() => {
    if (!calibration || commsEnqueuedRef.current) return;
    commsEnqueuedRef.current = true;
    const isSprint = [5, 6].includes(new Date().getDay());
    const resistanceIds = new Set(resistanceData?.hardAvoidanceQuests?.map(q => q.questId) ?? []);

    for (const q of calibration.recommendedQuests) {
      if (q.difficulty === 'S') {
        enqueueComm({ id: 'srank-assigned', message: 'S-Rank assigned. High difficulty. High reward. The System chose this for a reason.', priority: 'quest' });
        break;
      }
    }
    for (const q of calibration.recommendedQuests) {
      if (resistanceIds.has(q.id)) {
        enqueueComm({ id: 'resistance-quest', message: 'This quest targets a weak point. Completing it reduces your resistance score.', priority: 'quest' });
        break;
      }
    }
    if (isSprint) {
      const hasRevenue = calibration.recommendedQuests.some(q => q.stat === 'sales' || q.stat === 'wealth');
      if (hasRevenue) {
        enqueueComm({ id: 'revenue-sprint', message: 'Revenue quest. This directly moves you toward $10K MRR.', priority: 'quest' });
      }
    }
    if (todayCommitment && todayCommitment.completed === undefined) {
      enqueueComm({ id: 'precommit-reminder', message: 'You committed to this last night. Honor it.', priority: 'quest' });
    }
  }, [calibration, resistanceData, enqueueComm, todayCommitment]);

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) {
      const check = getLatestTodayCheck();
      setTodayCheck(check);
    }
  }, []);

  const handleCalibratedToggle = useCallback((questId: string) => {
    if (!calibration) return;
    const quest = calibration.recommendedQuests.find(q => q.id === questId);
    if (!quest) return;
    const persuasionData = persuasionMap.get(questId);

    setCompletedCalibrated(prev => {
      const next = new Set(prev);
      if (next.has(questId)) {
        next.delete(questId);
      } else {
        next.add(questId);
        saveCompletionRecord({ questId: quest.id, completedAt: new Date().toISOString(), stat: quest.stat });
        addCompletion({ questId: quest.id, questTitle: quest.title, xpEarned: quest.adjustedXP, completedAt: new Date().toISOString(), type: 'daily' });
        addXP(quest.adjustedXP);
        recordCompletion(persuasionData?.technique ?? null);
        onCalibratedQuestCompleted();
        // Roll for loot drop
        rollForLoot(quest.stat, playerStreak);
      }
      return next;
    });
  }, [calibration, addCompletion, addXP, persuasionMap, onCalibratedQuestCompleted, rollForLoot, playerStreak]);

  const handleProtocolToggle = (questId: string) => {
    const quest = protocolQuests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      const xp = quest.xp + (quest.geneticBonus?.bonusXp || 0);
      addCompletion({ questId: quest.id, questTitle: quest.title, xpEarned: xp, completedAt: new Date().toISOString(), type: 'daily' });
      addXP(xp);
      rollForLoot(quest.stat, playerStreak);
    }
    toggleQuest(questId);
  };

  // Load player goal for identity-linked messages
  const playerGoal = player.goal ?? 'becoming who you said you would be';

  const handlePillarToggle = useCallback((questId: string) => {
    const quest = pillar.quests.find(q => q.id === questId);
    if (quest && !pillar.isCompleted(questId)) {
      addCompletion({ questId: quest.id, questTitle: quest.title, xpEarned: quest.xp, completedAt: new Date().toISOString(), type: 'daily' });
      addXP(quest.xp);
      rollForLoot(quest.stat, playerStreak);
    }
    pillar.toggleQuest(questId);

    // Check if all pillars now complete (after this toggle)
    const wasCompleted = pillar.isCompleted(questId);
    if (!wasCompleted) {
      // Will become completed — check if this makes all 3 done
      const othersDone = pillar.quests
        .filter(q => q.id !== questId)
        .every(q => pillar.isCompleted(q.id));
      if (othersDone && !pillarStreak.hasCompletedToday) {
        const bonus = pillarStreak.recordAllPillarsComplete();
        if (bonus > 0) {
          setPillarBonusToast(bonus);
          addCompletion({ questId: 'pillar-mastery-bonus', questTitle: 'Pillar Mastery Bonus', xpEarned: bonus, completedAt: new Date().toISOString(), type: 'daily' });
          addXP(bonus);
          
          // Identity-linked mastery message
          toast(getSystemToast('pillarMastery', { goal: playerGoal }));
          setTimeout(() => setPillarBonusToast(null), 4000);

          // Check for streak milestones (7, 14, 30)
          const newStreak = pillarStreak.streak + 1;
          if ([7, 14, 30].includes(newStreak)) {
            setTimeout(() => {
              toast(getSystemToast('pillarStreakMilestone', { streak: newStreak, goal: playerGoal }));
              rollForLoot('discipline', playerStreak);
            }, 2000);
          }
        }
      }
    }
  }, [pillar, addCompletion, addXP, rollForLoot, playerStreak, pillarStreak, toast, playerGoal]);

  // Auto-honor pre-commitment
  useEffect(() => {
    if (todayCommitment && todayCommitment.completed === undefined && completedCalibrated.has(todayCommitment.questId)) {
      resolveCommitment(true);
      addCompletion({ questId: 'precommit-bonus', questTitle: 'Pre-Commitment Bonus', xpEarned: 25, completedAt: new Date().toISOString(), type: 'daily' });
      addXP(25);
    }
  }, [todayCommitment, completedCalibrated, resolveCommitment, addCompletion, addXP]);

  const hasScan = !!todayCheck;

  // Fallback to yesterday's last check if no scan today
  const fallbackCheck = useMemo<PlayerStateCheck | null>(() => {
    if (hasScan) return null;
    try {
      const stored = localStorage.getItem(STATE_HISTORY_KEY);
      if (!stored) return null;
      const checks: PlayerStateCheck[] = JSON.parse(stored);
      if (checks.length > 0) return checks[checks.length - 1];
    } catch { /* ignore */ }
    return null;
  }, [hasScan]);

  const activeCheck = todayCheck || fallbackCheck;
  const mode = activeCheck?.systemRecommendation || 'steady';
  const modeBadge = MODE_BADGE[mode] || MODE_BADGE.steady;

  // Total counts across both calibrated and protocol quests
  const calibratedTotal = calibration?.recommendedQuests.length ?? 0;
  const calibratedDone = completedCalibrated.size;
  const protocolStats = getTotalStats();
  const pillarTotal = pillar.quests.length;
  const pillarDone = pillar.completedCount;
  const totalQuests = calibratedTotal + protocolStats.total + pillarTotal;
  const totalDone = calibratedDone + protocolStats.completed + pillarDone;
  const allComplete = totalQuests > 0 && totalDone >= totalQuests;
  const progressPct = totalQuests > 0 ? (totalDone / totalQuests) * 100 : 0;

  // Sprint quest completion handler
  const handleSprintMarkComplete = useCallback((questId: string) => {
    handleCalibratedToggle(questId);
  }, [handleCalibratedToggle]);

  return (
    <>
      {/* Loot Drop Overlays */}
      {pendingDrop && !pendingDrop.isCinematic && (
        <LootDropToast item={pendingDrop.item} show={true} onDone={clearPendingDrop} />
      )}
      {pendingDrop && pendingDrop.isCinematic && (
        <LootCinematicReveal item={pendingDrop.item} show={true} onDone={clearPendingDrop} />
      )}
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />
      <ShadowQuestNotification show={shadowNotification} onDismiss={dismissShadowNotification} />
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

      {/* Sprint timer overlay */}
      <SprintOverlay
        state={sprint.state}
        availableQuests={calibration?.recommendedQuests ?? []}
        completedQuestIds={completedCalibrated}
        onStartSprint={sprint.startSprint}
        onComplete={sprint.handleCompletion}
        onStartNext={sprint.startNextSprint}
        onCancel={sprint.cancelSprint}
        onLogSprint={logSprint}
        onMarkQuestComplete={handleSprintMarkComplete}
        isLimitReached={sprint.isLimitReached}
      />

      <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}>
        <div className="mx-auto max-w-md space-y-4 px-4">

          {/* 1. TOP: Mode badge + sprint button + reset timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${modeBadge.dot}`} />
                <span className={`font-mono text-xs font-bold tracking-wider ${modeBadge.text}`}>
                  {modeBadge.label}
                </span>
              </div>
              {activeCheck && calibration && (
                <button
                  onClick={sprint.openSelection}
                  className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-primary transition-all hover:bg-primary/20 hover:border-primary/50"
                >
                  <Play className="h-3 w-3" />
                  SPRINT
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              {aiResult && (
                <div className="flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                  <span className="font-mono text-[9px] text-primary tracking-wider">AI</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">
                  {timeUntilReset.hours}h {timeUntilReset.minutes}m
                </span>
              </div>
            </div>
          </div>

          {/* AI Quest Generation timestamp */}
          {aiResult && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-primary/10 bg-primary/5 px-3 py-1.5">
              <Bot className="h-3 w-3 text-primary/60" />
              <span className="font-mono text-[10px] text-primary/60">
                Generated at {new Date(aiResult.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {' '}via {aiResult.provider}
              </span>
            </div>
          )}

          {/* Gentle nudge when no scan today */}
          {!hasScan && fallbackCheck && (
            <button
              onClick={() => setScanOpen(true)}
              className="w-full rounded-lg border border-border bg-card/50 p-3 text-left transition-all hover:border-primary/30"
            >
              <p className="font-mono text-xs text-muted-foreground">
                ⚠️ No scan today. Using yesterday's data. <span className="text-primary">Tap to scan.</span>
              </p>
            </button>
          )}

          {/* Training nudge */}
          {showTrainingNudge && (
            <button
              onClick={() => navigate('/training')}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                trainingRec.nudgeType === 'comt-dip'
                  ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                  : trainingRec.nudgeType === 'post-sprint-recovery'
                  ? 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50'
                  : 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
              }`}
            >
              <p className="font-mono text-xs text-muted-foreground">
                {trainingRec.nudgeType === 'comt-dip' ? '📉' : trainingRec.nudgeType === 'morning-activation' ? '💥' : '🌿'}{' '}
                {trainingRec.nudgeMessage}{' '}
                <span className="text-primary">Tap to train → {trainingRec.estimatedDuration}</span>
              </p>
            </button>
          )}

          {/* Sprint plan nudge */}
          {showPlanningNudge && (
            <button
              onClick={weekly.openPlanning}
              className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left transition-all hover:border-amber-500/50"
            >
              <p className="font-mono text-xs text-muted-foreground">
                📋 No sprint plan detected. The System has generated one.{' '}
                <span className="text-amber-400">Tap to review.</span>
              </p>
            </button>
          )}

          {/* No data at all */}
          {!hasScan && !fallbackCheck && (
            <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
              <ScanLine className="h-8 w-8 text-primary mx-auto animate-pulse" />
              <p className="font-mono text-xs text-muted-foreground">
                Run your first scan to calibrate quests
              </p>
              <Button
                onClick={() => setScanOpen(true)}
                className="font-mono tracking-wider text-xs"
                variant="outline"
              >
                RUN SCAN
              </Button>
            </div>
          )}

          {/* Morning Pillar Confirmation */}
          {needsPillarConfirmation && pillar.quests.length > 0 && (
            <PillarConfirmation quests={pillar.quests} onConfirm={handlePillarConfirm} />
          )}

          {/* ── DAILY PILLARS ── */}
          {pillar.quests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-bold tracking-widest text-foreground/90">
                    DAILY PILLARS
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground capitalize">
                    {pillar.dayType} day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Shield indicator */}
                  <div className="flex items-center gap-1" title={pillarStreak.shieldAvailable ? 'Pillar Shield active — 1 free miss this week' : 'Shield used this week'}>
                    {pillarStreak.shieldAvailable ? (
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                  </div>
                  {/* Streak */}
                  {pillarStreak.streak > 0 && (
                    <span className="font-mono text-[10px] text-secondary font-bold">
                      🔥 {pillarStreak.streak}
                    </span>
                  )}
                  {pillar.allCompleted && (
                    <span className="font-mono text-[10px] text-green-400">✓</span>
                  )}
                </div>
              </div>

              {/* Variable bonus banner */}
              {pillarBonusToast && (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-2 text-center animate-in fade-in duration-500">
                  <span className="font-mono text-xs text-primary font-bold">
                    ⚡ PILLAR MASTERY — +{pillarBonusToast} XP
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {pillar.quests.map(quest => {
                  const done = pillar.isCompleted(quest.id);
                  const cfg = PILLAR_CONFIG[quest.pillar];
                  const PillarIcon = quest.pillar === 'mind' ? Brain : quest.pillar === 'body' ? Zap : Target;

                  return (
                    <button
                      key={quest.id}
                      onClick={() => handlePillarToggle(quest.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        done
                          ? 'border-green-500/30 bg-green-500/5'
                          : `border-border bg-card/50 hover:border-primary/20`
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                        done ? 'border-green-500 bg-green-500/20' : cfg.glowClass + ' bg-card'
                      }`}>
                        {done ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <PillarIcon className={`h-4 w-4 ${cfg.color}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-tech text-sm font-semibold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {quest.title}
                          </h3>
                          <span className={`font-mono text-[10px] font-bold tracking-wider ${done ? 'text-muted-foreground' : cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          {quest.description}
                          <span className="ml-2 text-primary font-semibold">+{quest.xp} XP</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {todayCommitment && todayCommitment.completed === undefined && activeCheck && calibration && (
            (() => {
              const q = calibration.recommendedQuests.find(cq => cq.id === todayCommitment.questId);
              if (!q) return null;
              const done = completedCalibrated.has(q.id);
              return (
                <div
                  className={`rounded-lg border bg-card/50 p-3 transition-all ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}
                  style={{ borderLeft: '3px solid hsl(45 100% 50% / 0.6)' }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleCalibratedToggle(q.id)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                        done ? 'border-green-500 bg-green-500' : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {done && <Check className="h-3 w-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-tech text-sm font-semibold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {q.title}
                        </h3>
                        <DiffBadge d={q.difficulty} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="text-primary font-semibold">+{q.adjustedXP} XP</span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground italic">
                        Committed last night
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Shadow quest */}
          {shadowQuest && shadowRevealed && activeCheck && (
            <div
              className={`rounded-lg border bg-card/50 p-3 transition-all ${shadowQuest.completed ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}
              style={{ borderLeft: '3px solid hsl(263 91% 66% / 0.6)' }}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    if (!shadowQuest.completed && !shadowQuest.expired) {
                      completeShadow();
                      addCompletion({ questId: shadowQuest.id, questTitle: shadowQuest.title, xpEarned: shadowQuest.rewardXP, completedAt: new Date().toISOString(), type: 'daily' });
                    }
                  }}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    shadowQuest.completed ? 'border-secondary bg-secondary' : 'border-secondary/60 hover:border-secondary'
                  }`}
                >
                  {shadowQuest.completed && <Check className="h-3 w-3 text-secondary-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-wider text-secondary uppercase">SHADOW</span>
                      <h3 className={`font-tech text-sm font-semibold ${shadowQuest.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {shadowQuest.title}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-secondary font-semibold">+{shadowQuest.rewardXP} XP</span>
                    {shadowQuest.variableReward.isActive && !shadowQuest.completed && (
                      <Sparkles className="h-3 w-3 text-yellow-400/70" />
                    )}
                    {!shadowQuest.completed && !shadowQuest.expired && shadowTimeRemaining && (
                      <span className="text-muted-foreground font-mono">
                        {shadowTimeRemaining.minutes}:{String(shadowTimeRemaining.seconds).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calibrated quests by time block */}
          {activeCheck && calibration && groupedQuests && (
            <div className="space-y-5">
              {TIME_BLOCKS_ORDER.map(block => {
                const blockQuests = groupedQuests[block];
                if (blockQuests.length === 0) return null;
                const config = TIME_BLOCK_CONFIG[block];

                return (
                  <div key={block} className="space-y-2">
                    {/* Simple header with divider */}
                    <div className="flex items-center gap-3 px-1">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {config.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {config.time}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Quest cards */}
                    <div className="space-y-2">
                      {blockQuests.map(quest => {
                        const done = completedCalibrated.has(quest.id);
                        const persuasion = persuasionMap.get(quest.id);
                        const hasVariableReward = persuasion?.variableReward?.isActive ?? false;
                        const hasMessage = !!persuasion?.message && !done;
                        const isPreCommitted = todayCommitment?.questId === quest.id;

                        // Skip pre-committed quest here since it's shown at top
                        if (isPreCommitted) return null;

                        return (
                          <div
                            key={quest.id}
                            className={`rounded-lg border p-3 transition-all ${
                              done ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card/50 hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleCalibratedToggle(quest.id)}
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                                  done ? 'border-green-500 bg-green-500' : 'border-muted-foreground hover:border-primary'
                                }`}
                              >
                                {done && <Check className="h-3 w-3 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className={`font-tech text-sm font-semibold ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                    {quest.title}
                                  </h3>
                                  <DiffBadge d={quest.difficulty} />
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                                  <span className="text-primary font-semibold">
                                    +{quest.adjustedXP} XP
                                  </span>
                                  {hasVariableReward && !done && (
                                    <Sparkles className="h-3 w-3 text-yellow-400/70" />
                                  )}
                                </div>
                                {hasMessage && persuasion?.message && (
                                  <p className={`mt-1 font-mono text-[11px] italic leading-snug truncate ${getPersuasionColor(persuasion.framingColor)}`}>
                                    {persuasion.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Protocol quests by time block */}
          <div className="space-y-5">
            {TIME_BLOCKS_ORDER.map(block => {
              const blockQuests = getQuestsByTimeBlock(block);
              if (blockQuests.length === 0) return null;
              const config = TIME_BLOCK_CONFIG[block];

              return (
                <div key={`proto-${block}`} className="space-y-2">
                  <div className="flex items-center gap-3 px-1">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {config.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {config.time}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-2">
                    {blockQuests.map(quest => {
                      const totalXp = quest.xp + (quest.geneticBonus?.bonusXp || 0);
                      return (
                        <div
                          key={quest.id}
                          className={`rounded-lg border p-3 transition-all ${
                            quest.completed ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card/50 hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleProtocolToggle(quest.id)}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                                quest.completed ? 'border-green-500 bg-green-500' : 'border-muted-foreground hover:border-primary'
                              }`}
                            >
                              {quest.completed && <Check className="h-3 w-3 text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-tech text-sm font-semibold ${quest.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {quest.title}
                              </h3>
                              <div className="mt-0.5 text-xs">
                                <span className="text-primary font-semibold">+{totalXp} XP</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. BOTTOM: Completion summary */}
          <div className="space-y-2 pt-2">
            <Progress value={progressPct} className="h-1.5" />
            {allComplete ? (
              <p className="text-center font-mono text-xs text-green-400">
                All quests complete. The System is satisfied.
              </p>
            ) : (
              <p className="text-center font-mono text-xs text-muted-foreground">
                {totalDone} of {totalQuests} quests complete
              </p>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Quests;
