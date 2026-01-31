import { PlayerProfile } from '@/components/dashboard/PlayerProfile';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { BottomNav } from '@/components/navigation/BottomNav';
import { usePlayer } from '@/hooks/usePlayer';

const Index = () => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner } = usePlayer();

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      
      <div className="min-h-screen bg-background px-4 pb-24 pt-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* System Header */}
          <div className="text-center">
            <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
              [ The System ]
            </h1>
          </div>

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

          {/* System Message */}
          <div className="rounded-lg border border-border bg-card/50 p-4 text-center">
            <p className="font-tech text-sm text-muted-foreground">
              The System is watching. Complete your daily quests to grow stronger.
            </p>
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Index;
