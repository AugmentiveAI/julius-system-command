import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, ScanLine, Check, Sparkles } from 'lucide-react';
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

// ── Storage helpers ──────────────────────────────────────────────────

const STATE_HISTORY_KEY = 'systemStateHistory';
const CALIBRATED_COMPLETIONS_KEY = 'systemCalibratedCompletions';

function getLatestTodayCheck(): PlayerStateCheck | null {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (!stored) return null;
    const checks: PlayerStateCheck[] = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];
    const todayChecks = checks.filter(c =>
      new Date(c.timestamp).toISOString().split('T')[0] === today
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
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
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
  const { addCompletion } = useHistoryContext();
  const { todayCommitment, resolveCommitment } = usePreCommitment();
  const [scanOpen, setScanOpen] = useState(false);
  const [todayCheck, setTodayCheck] = useState<PlayerStateCheck | null>(getLatestTodayCheck);
  const [unlocked, setUnlocked] = useState(!!todayCheck);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight);
  const [completedCalibrated, setCompletedCalibrated] = useState<Set<string>>(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return new Set(getCompletionHistory().filter(c => c.completedAt.startsWith(today)).map(c => c.questId));
    } catch { return new Set(); }
  });

  useEffect(() => {
    const interval = setInterval(() => setTimeUntilReset(getTimeUntilMidnight()), 60000);
    return () => clearInterval(interval);
  }, []);

  const calibration = useMemo<CalibrationResult | null>(() => {
    if (!todayCheck) return null;
    return calibrateQuests(todayCheck, getStateHistory(), getCompletionHistory(), new Date());
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

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) {
      const check = getLatestTodayCheck();
      setTodayCheck(check);
      if (check) setTimeout(() => setUnlocked(true), 100);
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
        recordCompletion(persuasionData?.technique ?? null);
        onCalibratedQuestCompleted();
      }
      return next;
    });
  }, [calibration, addCompletion, persuasionMap, onCalibratedQuestCompleted]);

  const handleProtocolToggle = (questId: string) => {
    const quest = protocolQuests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      addCompletion({ questId: quest.id, questTitle: quest.title, xpEarned: quest.xp + (quest.geneticBonus?.bonusXp || 0), completedAt: new Date().toISOString(), type: 'daily' });
    }
    toggleQuest(questId);
  };

  // Auto-honor pre-commitment
  useEffect(() => {
    if (todayCommitment && todayCommitment.completed === undefined && completedCalibrated.has(todayCommitment.questId)) {
      resolveCommitment(true);
      addCompletion({ questId: 'precommit-bonus', questTitle: 'Pre-Commitment Bonus', xpEarned: 25, completedAt: new Date().toISOString(), type: 'daily' });
    }
  }, [todayCommitment, completedCalibrated, resolveCommitment, addCompletion]);

  const hasScan = !!todayCheck;
  const mode = todayCheck?.systemRecommendation || 'steady';
  const modeBadge = MODE_BADGE[mode] || MODE_BADGE.steady;

  // Total counts across both calibrated and protocol quests
  const calibratedTotal = calibration?.recommendedQuests.length ?? 0;
  const calibratedDone = completedCalibrated.size;
  const protocolStats = getTotalStats();
  const totalQuests = calibratedTotal + protocolStats.total;
  const totalDone = calibratedDone + protocolStats.completed;
  const allComplete = totalQuests > 0 && totalDone >= totalQuests;
  const progressPct = totalQuests > 0 ? (totalDone / totalQuests) * 100 : 0;

  return (
    <>
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />
      <ShadowQuestNotification show={shadowNotification} onDismiss={dismissShadowNotification} />

      <div className="min-h-screen bg-background pb-24 pt-4">
        <div className="mx-auto max-w-md space-y-4 px-4">

          {/* 1. TOP: Mode badge + reset timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${modeBadge.dot}`} />
              <span className={`font-mono text-xs font-bold tracking-wider ${modeBadge.text}`}>
                {modeBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">
                {timeUntilReset.hours}h {timeUntilReset.minutes}m
              </span>
            </div>
          </div>

          {/* Scan required state */}
          {!hasScan && (
            <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
              <ScanLine className="h-8 w-8 text-primary mx-auto animate-pulse" />
              <p className="font-mono text-xs text-muted-foreground">
                Complete daily scan to unlock quests
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

          {/* Pre-committed quest (top, gold left-border) */}
          {todayCommitment && todayCommitment.completed === undefined && hasScan && calibration && (
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
          {shadowQuest && shadowRevealed && hasScan && (
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
          {hasScan && calibration && groupedQuests && (
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
