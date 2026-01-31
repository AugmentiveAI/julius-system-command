import { User } from 'lucide-react';
import { Player } from '@/types/player';

interface PlayerProfileProps {
  player: Player;
}

export const PlayerProfile = ({ player }: PlayerProfileProps) => {
  const xpPercentage = (player.currentXP / player.xpToNextLevel) * 100;
  const isNearLevelUp = xpPercentage >= 80;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-muted glow-primary">
          <User className="h-8 w-8 text-primary" />
        </div>

        {/* Player Info */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Player:</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {player.name}
          </h1>
          <p className="font-tech text-lg font-semibold text-secondary">
            {player.title}
          </p>
        </div>

        {/* Level Badge */}
        <div className="text-center">
          <div className="font-display text-xs uppercase tracking-wider text-muted-foreground">
            Level
          </div>
          <div className="font-display text-4xl font-bold text-primary text-glow-primary">
            {player.level}
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-tech text-muted-foreground">Experience</span>
          <span className="font-tech text-primary">
            {player.currentXP} / {player.xpToNextLevel} XP
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full bg-primary transition-all duration-500 ${
              isNearLevelUp ? 'animate-pulse-glow glow-xp' : ''
            }`}
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
