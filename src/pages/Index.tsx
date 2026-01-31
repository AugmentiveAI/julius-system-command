import { PlayerProfile } from '@/components/dashboard/PlayerProfile';
import { StatsRadarChart } from '@/components/dashboard/StatsRadarChart';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { INITIAL_PLAYER } from '@/types/player';

const Index = () => {
  // For now, use initial player data. Will add persistence later.
  const player = INITIAL_PLAYER;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* System Header */}
        <div className="text-center">
          <h1 className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            [ The System ]
          </h1>
        </div>

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
    </div>
  );
};

export default Index;
