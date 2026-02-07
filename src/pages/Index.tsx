import { Coffee } from 'lucide-react';
import { PlayerProfile } from '@/components/dashboard/PlayerProfile';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import { SystemMessage } from '@/components/dashboard/SystemMessage';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { GeneticWarning } from '@/components/warnings/GeneticWarning';
import { BottomNav } from '@/components/navigation/BottomNav';
import { usePlayer } from '@/hooks/usePlayer';
import { useCaffeine } from '@/hooks/useCaffeine';
import { useProtocolQuests } from '@/hooks/useProtocolQuests';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState } = usePlayer();
  const { logCaffeine, hasLoggedAfter10am, warningDismissed, dismissWarning } = useCaffeine();
  const { toggleQuest, quests } = useProtocolQuests();
  const { toast } = useToast();

  const handleLogCaffeine = () => {
    logCaffeine();
    const now = new Date();
    const isAfter10 = now.getHours() >= 10;

    if (isAfter10) {
      // Mark caffeine-cutoff quest as failed (ensure it's uncompleted)
      const cutoffQuest = quests.find(q => q.id === 'caffeine-cutoff');
      if (cutoffQuest?.completed) {
        toggleQuest('caffeine-cutoff');
      }
    }

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

      <div className="min-h-screen bg-background px-4 pb-24 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* System Header */}
          <div className="flex items-center justify-center gap-3">
            <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
              [ The System ]
            </h1>
            <button
              onClick={handleLogCaffeine}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:border-primary/50 hover:bg-primary/10"
              title="Log caffeine"
            >
              <Coffee className="h-4 w-4 text-muted-foreground" />
            </button>
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
