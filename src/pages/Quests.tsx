import { useState, useEffect, useMemo, useCallback } from 'react';
import { Clock, ScanLine } from 'lucide-react';
import { BottomNav } from '@/components/navigation/BottomNav';
import { TimeBlockSection } from '@/components/quests/TimeBlockSection';
import { CalibrationBanner } from '@/components/quests/CalibrationBanner';
import { CalibrationDetails } from '@/components/quests/CalibrationDetails';
import { CalibratedQuestCard } from '@/components/quests/CalibratedQuestCard';
import StateCheck from '@/components/StateCheck';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { usePersuasion, recordCompletion, recordSkip } from '@/hooks/usePersuasion';
import { usePreCommitment } from '@/hooks/usePreCommitment';
import { PreCommitmentBanner } from '@/components/quests/PreCommitmentBanner';
import { QuestTimeBlock, TIME_BLOCK_CONFIG } from '@/types/quests';
import { PlayerStateCheck } from '@/types/playerState';
import {
  calibrateQuests,
  CalibrationResult,
  CalibratedQuest,
  QuestCompletionRecord,
} from '@/utils/questCalibration';
import { loadCachedResistance } from '@/utils/resistanceTracker';
import { ChevronDown, Brain, Moon, Dumbbell } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { GeneticHUD } from '@/components/genetic/GeneticHUD';

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
    // Keep last 200
    const trimmed = history.slice(-200);
    localStorage.setItem(CALIBRATED_COMPLETIONS_KEY, JSON.stringify(trimmed));
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

function getRecentCompletionRate(completions: QuestCompletionRecord[]): number {
  if (completions.length === 0) return 0;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recent = completions.filter(c => new Date(c.completedAt) >= weekAgo);
  // Rough estimate: assume ~5 quests per day * 7 = 35 possible
  return Math.min(100, Math.round((recent.length / 35) * 100));
}

// Assign calibrated quests to time blocks based on their stat
function assignTimeBlock(quest: CalibratedQuest): QuestTimeBlock {
  if (quest.isBreak) return 'morning'; // breaks go wherever, default morning
  switch (quest.stat) {
    case 'discipline':
      if (quest.id.includes('walk') || quest.id.includes('cold')) return 'morning';
      if (quest.id.includes('supplement')) return 'morning';
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

const TIME_BLOCKS_ORDER: QuestTimeBlock[] = ['morning', 'midday', 'afternoon', 'evening'];

const TIME_BLOCK_ICONS: Record<QuestTimeBlock, React.ElementType> = {
  morning: Clock,
  midday: Dumbbell,
  afternoon: Brain,
  evening: Moon,
};

const Quests = () => {
  const { quests: protocolQuests, toggleQuest, getQuestsByTimeBlock, getTimeBlockStats, getTotalStats } =
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
      const history = getCompletionHistory();
      return new Set(history.filter(c => c.completedAt.startsWith(today)).map(c => c.questId));
    } catch { return new Set(); }
  });

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimeUntilReset(getTimeUntilMidnight()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calibration result
  const calibration = useMemo<CalibrationResult | null>(() => {
    if (!todayCheck) return null;
    return calibrateQuests(
      todayCheck,
      getStateHistory(),
      getCompletionHistory(),
      new Date(),
    );
  }, [todayCheck]);

  // Resistance data for persuasion engine
  const resistanceData = useMemo(() => loadCachedResistance(), []);

  // Persuasion engine: generates messages for each calibrated quest
  const persuasionMap = usePersuasion(
    calibration?.recommendedQuests ?? [],
    todayCheck,
    resistanceData,
  );

  // Resistance quest IDs for display
  const resistanceQuestIds = useMemo(() => {
    const ids = new Set<string>();
    if (resistanceData) {
      for (const rp of resistanceData.hardAvoidanceQuests) {
        ids.add(rp.questId);
      }
    }
    return ids;
  }, [resistanceData]);

  // Group calibrated quests by time block
  const groupedQuests = useMemo(() => {
    if (!calibration) return null;
    const groups: Record<QuestTimeBlock, CalibratedQuest[]> = {
      morning: [],
      midday: [],
      afternoon: [],
      evening: [],
    };
    calibration.recommendedQuests.forEach(q => {
      const block = assignTimeBlock(q);
      groups[block].push(q);
    });
    return groups;
  }, [calibration]);

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) {
      const check = getLatestTodayCheck();
      setTodayCheck(check);
      if (check) {
        // Animate unlock
        setTimeout(() => setUnlocked(true), 100);
      }
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
        // Log completion
        saveCompletionRecord({
          questId: quest.id,
          completedAt: new Date().toISOString(),
          stat: quest.stat,
        });
        addCompletion({
          questId: quest.id,
          questTitle: quest.title,
          xpEarned: quest.adjustedXP,
          completedAt: new Date().toISOString(),
          type: 'daily',
        });
        // Record persuasion outcome
        recordCompletion(persuasionData?.technique ?? null);
      }
      return next;
    });
  }, [calibration, addCompletion, persuasionMap]);

  // Also keep protocol quest toggling for protocol quests
  const handleProtocolToggle = (questId: string) => {
    const quest = protocolQuests.find(q => q.id === questId);
    if (quest && !quest.completed) {
      const totalXp = quest.xp + (quest.geneticBonus?.bonusXp || 0);
      addCompletion({
        questId: quest.id,
        questTitle: quest.title,
        xpEarned: totalXp,
        completedAt: new Date().toISOString(),
        type: 'daily',
      });
    }
    toggleQuest(questId);
  };

  const totalStats = getTotalStats();
  const hasScan = !!todayCheck;
  const xpMultiplier = calibration
    ? (todayCheck?.systemRecommendation === 'push' ? 1.25
      : todayCheck?.systemRecommendation === 'recover' ? 0.75 : 1)
    : 1;

  return (
    <>
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />

      <div className="min-h-screen bg-background pb-24 pt-6">
        <GeneticHUD />
        <div className="mx-auto max-w-2xl space-y-4 px-4 mt-3">
          {/* System Header */}
          <div className="text-center">
            <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
              [ The System ]
            </h1>
          </div>

          {/* Calibration Banner or Locked State */}
          {hasScan && calibration && todayCheck ? (
            <CalibrationBanner
              mode={todayCheck.systemRecommendation}
              intensity={calibration.intensity}
              systemMessage={calibration.systemMessage}
              xpMultiplier={xpMultiplier}
              geneticAlert={calibration.geneticAlert}
              recoveryBonus={todayCheck.systemRecommendation === 'recover'}
            />
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-4">
              <ScanLine className="h-10 w-10 text-amber-400 mx-auto animate-pulse" />
              <div>
                <h2 className="font-mono text-sm font-bold tracking-[0.15em] text-amber-400">
                  SYSTEM SCAN REQUIRED
                </h2>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Complete daily diagnostic to unlock quests.
                </p>
              </div>
              <Button
                onClick={() => setScanOpen(true)}
                className="font-mono tracking-[0.15em] text-sm bg-primary/10 border border-primary/50 text-primary hover:bg-primary/20"
              >
                RUN SCAN
              </Button>
            </div>
          )}

          {/* Daily XP Header */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Daily Protocol
                </h2>
                <p className="mt-1 font-tech text-lg">
                  <span className="text-primary">{totalStats.earnedXp}</span>
                  <span className="text-muted-foreground"> / {totalStats.totalXp} XP</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-tech text-sm">
                  Resets in {timeUntilReset.hours}h {timeUntilReset.minutes}m
                </span>
              </div>
            </div>
            {totalStats.completed === totalStats.total && (
              <div className="mt-3 rounded-md bg-green-500/10 px-3 py-2 text-center">
                <p className="font-tech text-sm text-green-400">
                  Protocol complete. The System is pleased.
                </p>
              </div>
            )}
          </div>

          {/* Calibrated Quests (if scan done) */}
          {hasScan && calibration && groupedQuests && (
            <div className="space-y-3">
              <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground px-1">
                ◈ CALIBRATED QUESTS
              </h3>

              {/* Pre-commitment banner */}
              {todayCommitment && (
                <PreCommitmentBanner
                  commitment={todayCommitment}
                  questCompleted={completedCalibrated.has(todayCommitment.questId)}
                  onHonored={() => {
                    resolveCommitment(true);
                    // Award bonus XP via history
                    addCompletion({
                      questId: 'precommit-bonus',
                      questTitle: 'Pre-Commitment Bonus',
                      xpEarned: 25,
                      completedAt: new Date().toISOString(),
                      type: 'daily',
                    });
                  }}
                />
              )}

              {TIME_BLOCKS_ORDER.map(block => {
                const blockQuests = groupedQuests[block];
                if (blockQuests.length === 0) return null;
                const config = TIME_BLOCK_CONFIG[block];
                const Icon = TIME_BLOCK_ICONS[block];
                const blockCompleted = blockQuests.filter(q => completedCalibrated.has(q.id)).length;

                return (
                  <Collapsible key={block} defaultOpen>
                    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${config.color}`} />
                            <div className="text-left">
                              <h3 className={`font-display text-sm font-semibold ${config.color}`}>
                                {config.label}
                              </h3>
                              <p className="text-xs text-muted-foreground">{config.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className={`font-tech text-sm ${blockCompleted === blockQuests.length ? 'text-green-400' : 'text-foreground'}`}>
                              {blockCompleted}/{blockQuests.length}
                            </p>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 space-y-2">
                          {blockQuests.map((quest, i) => (
                            <CalibratedQuestCard
                              key={quest.id}
                              quest={quest}
                              completed={completedCalibrated.has(quest.id)}
                              locked={!unlocked}
                              onToggle={handleCalibratedToggle}
                              animDelay={unlocked ? i * 200 : 0}
                              persuasion={persuasionMap.get(quest.id)}
                              isResistanceQuest={resistanceQuestIds.has(quest.id)}
                              isPreCommitted={todayCommitment?.questId === quest.id}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}

          {/* Locked placeholder when no scan */}
          {!hasScan && (
            <div className="space-y-3">
              <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground px-1">
                ◈ CALIBRATED QUESTS
              </h3>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-lg border border-border/30 bg-card/20 p-3 opacity-30">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center">
                      <ScanLine className="h-3 w-3 text-muted-foreground/30" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-muted-foreground/15 rounded" />
                      <div className="h-2 w-1/2 bg-muted-foreground/10 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Protocol Time Block Sections (always shown) */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs tracking-[0.15em] text-muted-foreground px-1">
              ◈ PROTOCOL QUESTS
            </h3>
            {TIME_BLOCKS_ORDER.map(timeBlock => (
              <TimeBlockSection
                key={timeBlock}
                timeBlock={timeBlock}
                quests={getQuestsByTimeBlock(timeBlock)}
                stats={getTimeBlockStats(timeBlock)}
                onToggleQuest={handleProtocolToggle}
              />
            ))}
          </div>

          {/* Why These Quests */}
          {hasScan && calibration && todayCheck && (
            <CalibrationDetails
              currentState={todayCheck}
              intensity={calibration.intensity}
              questCount={calibration.recommendedQuests.length}
              geneticAlert={calibration.geneticAlert}
              recentCompletionRate={getRecentCompletionRate(getCompletionHistory())}
            />
          )}
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Quests;
