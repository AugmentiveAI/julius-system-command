import { PlayerProfile } from '@/components/dashboard/PlayerProfile';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { PenaltyBanner } from '@/components/dashboard/PenaltyBanner';
import { SystemMessage } from '@/components/dashboard/SystemMessage';
import { FlashOverlay } from '@/components/effects/FlashOverlay';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { BottomNav } from '@/components/navigation/BottomNav';
import { usePlayer } from '@/hooks/usePlayer';

const Index = () => {
  const { player, penaltyLevel, showFlashEffect, dismissPenaltyBanner, levelUpState } = usePlayer();

  return (
    <>
      <FlashOverlay show={showFlashEffect} />
      <LevelUpOverlay show={levelUpState.show} newLevel={levelUpState.newLevel} />
      
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

          {/* System Message of the Day */}
          <SystemMessage />
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Index;
