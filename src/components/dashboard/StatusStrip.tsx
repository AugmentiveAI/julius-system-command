import { Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatusStripProps {
  rank: string;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  streak: number;
}

function getRankLetter(rank: string): string {
  // TODO: Phase2-IP-rebrand — rank letters
  if (rank.includes('S-Rank')) return 'S';
  if (rank.includes('A-Rank')) return 'A';
  if (rank.includes('B-Rank')) return 'B';
  if (rank.includes('C-Rank')) return 'C';
  if (rank.includes('D-Rank')) return 'D';
  if (rank.includes('Monarch')) return 'M';
  return 'E';
}

export function StatusStrip({ rank, level, currentXP, xpToNextLevel, streak }: StatusStripProps) {
  const xpPct = xpToNextLevel > 0 ? (currentXP / xpToNextLevel) * 100 : 0;
  const rankLetter = getRankLetter(rank);

  return (
    <div className="flex items-center gap-3 h-12 px-4">
      {/* Left: Rank + Level */}
      <span className="font-mono text-xs font-bold text-foreground tracking-wider shrink-0">
        <span className="text-primary">[{rankLetter}]</span> Lv.{level}
      </span>

      {/* Center: XP Bar */}
      <div className="flex-1 relative">
        <Progress
          value={xpPct}
          className="h-1.5 bg-muted/30"
        />
      </div>

      {/* Right: Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <Flame className="h-3.5 w-3.5 text-destructive" />
          <span className="font-mono text-xs font-bold text-destructive">{streak}</span>
        </div>
      )}
    </div>
  );
}
