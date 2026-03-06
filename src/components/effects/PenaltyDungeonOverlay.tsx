import { useEffect, useState } from 'react';
import { Dungeon, DungeonObjective } from '@/types/dungeon';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Skull, Timer } from 'lucide-react';
import { PlayerStats } from '@/types/player';

interface PenaltyDungeonOverlayProps {
  dungeon: Dungeon;
  timeRemaining: number;
  lowestStat: keyof PlayerStats;
  penaltyReduction: number;
  showFailure: boolean;
  onCompleteObjective: (objectiveId: string) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function PenaltyDungeonOverlay({
  dungeon,
  timeRemaining,
  lowestStat,
  penaltyReduction,
  showFailure,
  onCompleteObjective,
}: PenaltyDungeonOverlayProps) {
  const [pulse, setPulse] = useState(false);
  const objectives = dungeon.objectives as DungeonObjective[];
  const allDone = objectives.every(o => o.completed);
  const isUrgent = timeRemaining < 30 * 60 * 1000; // < 30 min

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  // Failure screen
  if (showFailure) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
        <div className="text-center space-y-6 animate-in fade-in duration-1000">
          <Skull className="w-20 h-20 text-destructive mx-auto animate-pulse" />
          <h1 className="font-mono text-3xl font-bold tracking-widest text-destructive uppercase">
            PENALTY APPLIED
          </h1>
          <div className="space-y-2">
            <p className="font-mono text-sm text-destructive/80">
              {lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1)} reduced by {penaltyReduction}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              The System does not forgive stagnation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (allDone) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-full border-2 border-primary mx-auto flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-widest text-primary uppercase">
            PENALTY QUEST SURVIVED
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            +{dungeon.xp_reward} XP. Don't let it happen again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-1500 ${
      pulse ? 'bg-black' : 'bg-destructive/10'
    }`}>
      {/* Pulsing border effect */}
      <div className={`absolute inset-0 border-4 transition-colors duration-1500 pointer-events-none ${
        pulse ? 'border-destructive/60' : 'border-destructive/20'
      }`} />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className={`w-5 h-5 transition-colors duration-1500 ${pulse ? 'text-destructive' : 'text-destructive/50'}`} />
            <h1 className="font-mono text-lg font-bold tracking-[0.3em] text-destructive uppercase">
              PENALTY QUEST
            </h1>
            <AlertTriangle className={`w-5 h-5 transition-colors duration-1500 ${pulse ? 'text-destructive' : 'text-destructive/50'}`} />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground/60 tracking-wider">
            {dungeon.description}
          </p>
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
            isUrgent ? 'border-destructive bg-destructive/10' : 'border-border bg-card/50'
          }`}>
            <Timer className={`w-4 h-4 ${isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <span className={`font-mono text-2xl font-bold tracking-widest ${
              isUrgent ? 'text-destructive' : 'text-foreground'
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-3">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Objectives
          </p>
          {objectives.map((obj) => (
            <button
              key={obj.id}
              onClick={() => !obj.completed && onCompleteObjective(obj.id)}
              disabled={obj.completed}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                obj.completed
                  ? 'border-primary/30 bg-primary/5 opacity-60'
                  : 'border-destructive/30 bg-card/30 hover:border-destructive/60 active:scale-[0.98]'
              }`}
            >
              <Checkbox
                checked={obj.completed}
                className={obj.completed ? 'border-primary data-[state=checked]:bg-primary' : 'border-destructive'}
              />
              <span className={`font-mono text-xs ${
                obj.completed ? 'text-muted-foreground line-through' : 'text-foreground'
              }`}>
                {obj.title}
              </span>
            </button>
          ))}
        </div>

        {/* Failure warning */}
        <div className="text-center space-y-1 pt-2">
          <p className="font-mono text-[10px] text-destructive/70 tracking-wider uppercase">
            Failure Consequence
          </p>
          <p className="font-mono text-xs text-destructive">
            {lowestStat.charAt(0).toUpperCase() + lowestStat.slice(1)} will be permanently reduced by {penaltyReduction}
          </p>
        </div>
      </div>
    </div>
  );
}
