import { useEffect, useRef, useState, useCallback } from 'react';
import { Coffee, ScanLine } from 'lucide-react';
import { PlayerProfile } from '@/components/dashboard/PlayerProfile';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import { SystemMessage } from '@/components/dashboard/SystemMessage';
import { DailyXPBar } from '@/components/dashboard/DailyXPBar';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CurrentStateCard } from '@/components/dashboard/CurrentStateCard';
import StateCheck from '@/components/StateCheck';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { GeneticWarning } from '@/components/warnings/GeneticWarning';
import { BottomNav } from '@/components/navigation/BottomNav';
import { usePlayer } from '@/hooks/usePlayer';
import { useCaffeine } from '@/hooks/useCaffeine';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useWorkout } from '@/hooks/useWorkout';
import { useDailyXP } from '@/hooks/useDailyXP';
import { useToast } from '@/hooks/use-toast';

const LAST_SCAN_DATE_KEY = 'systemLastScanDate';

function needsDailyScan(): boolean {
  const today = new Date().toISOString().split('T')[0];
  return localStorage.getItem(LAST_SCAN_DATE_KEY) !== today;
}

function markScanDone() {
  localStorage.setItem(LAST_SCAN_DATE_KEY, new Date().toISOString().split('T')[0]);
}

const Index = () => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState } = usePlayer();
  const { logCaffeine, hasLoggedAfter10am, warningDismissed, dismissWarning, logs } = useCaffeine();
  const { toggleQuest, setQuestCompleted, quests, getTimeBlockStats } = useProtocolQuests();
  const { workout, workoutCompleted } = useWorkout();
  const { toast } = useToast();

  const [scanOpen, setScanOpen] = useState(false);
  const [stateRefreshKey, setStateRefreshKey] = useState(0);
  const autoScanRef = useRef(false);

  const dailyXP = useDailyXP({
    quests,
    workoutCompleted,
    workoutXP: workout.xp,
    coldStreakDays: player.coldStreak ?? 0,
  });

  // Auto-trigger scan on first daily load
  useEffect(() => {
    if (needsDailyScan() && !autoScanRef.current) {
      autoScanRef.current = true;
      toast({
        title: '◈ Daily diagnostic required',
        description: 'The System must assess your condition.',
      });
      // Small delay so user sees the toast first
      setTimeout(() => setScanOpen(true), 800);
    }
  }, [toast]);

  const handleScanClose = useCallback((open: boolean) => {
    setScanOpen(open);
    if (!open) {
      markScanDone();
      setStateRefreshKey(k => k + 1);
    }
  }, []);

  // --- Cross-system sync effects ---
  const syncedRef = useRef({ workout: false, caffeine: false });
  const achievementRef = useRef({ morning: false, allDaily: false });

  // Achievement: Morning Protocol Complete
  useEffect(() => {
    const morningQuests = quests.filter(q => q.timeBlock === 'morning');
    const allMorningDone = morningQuests.length > 0 && morningQuests.every(q => q.completed);
    if (allMorningDone && !achievementRef.current.morning) {
      achievementRef.current.morning = true;
      toast({
        title: "⚡ MORNING PROTOCOL COMPLETE",
        description: "All morning quests cleared. The System acknowledges.",
      });
    }
    if (!allMorningDone) achievementRef.current.morning = false;
  }, [quests, toast]);

  // Achievement: Daily Protocol Mastered
  useEffect(() => {
    const allDone = quests.length > 0 && quests.every(q => q.completed);
    if (allDone && !achievementRef.current.allDaily) {
      achievementRef.current.allDaily = true;
      toast({
        title: "🏆 DAILY PROTOCOL MASTERED",
        description: "All quests complete. You have proven worthy.",
      });
    }
    if (!allDone) achievementRef.current.allDaily = false;
  }, [quests, toast]);

  // Auto-complete "scheduled-training" quest when workout is completed
  useEffect(() => {
    if (workoutCompleted && !syncedRef.current.workout) {
      syncedRef.current.workout = true;
      setQuestCompleted('scheduled-training', true);
    }
    if (!workoutCompleted) {
      syncedRef.current.workout = false;
    }
  }, [workoutCompleted, setQuestCompleted]);

  // Auto-fail "caffeine-cutoff" quest when caffeine logged after 10am
  useEffect(() => {
    if (hasLoggedAfter10am) {
      setQuestCompleted('caffeine-cutoff', false);
    }
  }, [hasLoggedAfter10am, setQuestCompleted]);

  const handleLogCaffeine = () => {
    logCaffeine();
    const now = new Date();
    const isAfter10 = now.getHours() >= 10;

    toast({
      title: isAfter10 ? '☕ Caffeine Logged — Debuff Active' : '☕ Caffeine Logged',
      description: isAfter10
        ? 'CYP1A2 slow metabolism warning triggered.'
        : `Logged at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
  };

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      <StateCheck open={scanOpen} onOpenChange={handleScanClose} />

      <div className="min-h-screen bg-background px-4 pb-24 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* System Header */}
          <div className="flex items-center justify-center gap-3">
            <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
              [ The System ]
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScanOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(187,100%,50%,0.3)]"
                title="System Scan"
              >
                <ScanLine className="h-4 w-4 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(187 100% 50% / 0.6))' }} />
              </button>
              <button
                onClick={handleLogCaffeine}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-primary/50 hover:bg-primary/10"
                title="Log caffeine"
              >
                <Coffee className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

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

          {/* Player Profile */}
          <PlayerProfile player={player} />

          {/* Daily XP Progress */}
          <DailyXPBar breakdown={dailyXP} />

          {/* Current State Card */}
          <CurrentStateCard onRescan={() => setScanOpen(true)} refreshKey={stateRefreshKey} />

          {/* Quick Actions & Protocol Progress */}
          <QuickActions
            quests={quests}
            workout={workout}
            workoutCompleted={workoutCompleted}
            hasLoggedAfter10am={hasLoggedAfter10am}
            caffeineLogCount={logs.length}
            getTimeBlockStats={getTimeBlockStats}
          />

          {/* Stats Radar Chart */}
          <StatsRadarChart stats={player.stats} />

          {/* Streak Counter */}
          <StreakCounter streak={player.streak} />

          {/* System Message of the Day */}
          <SystemMessage />
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Index;
