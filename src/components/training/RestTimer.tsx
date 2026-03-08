import { Timer, X, Play, RotateCcw } from 'lucide-react';
import { useRestTimer } from '@/hooks/useRestTimer';

interface RestTimerProps {
  onDismiss: () => void;
  defaultSeconds?: number;
  autoStart?: boolean;
}

function formatSeconds(s: number): string {
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function RestTimer({ onDismiss, defaultSeconds = 120, autoStart = true }: RestTimerProps) {
  const { isRunning, secondsRemaining, progress, start, stop, reset } = useRestTimer(defaultSeconds);

  // Auto-start on mount
  if (autoStart && !isRunning && secondsRemaining === defaultSeconds) {
    start();
  }

  const isDone = !isRunning && secondsRemaining === 0;

  return (
    <div className={`rounded-lg border p-3 transition-all ${
      isDone
        ? 'border-primary/50 bg-primary/10'
        : 'border-border bg-card/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className={`h-4 w-4 ${isDone ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Rest Timer
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isRunning && !isDone && (
            <button onClick={() => start()} className="p-1 rounded hover:bg-muted">
              <Play className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={() => reset()} className="p-1 rounded hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDismiss} className="p-1 rounded hover:bg-muted">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isDone ? 'bg-primary' : 'bg-muted-foreground/50'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-1.5 text-center">
        <span className={`font-mono text-lg font-bold ${
          isDone ? 'text-primary' : secondsRemaining <= 10 ? 'text-amber-400' : 'text-foreground'
        }`}>
          {isDone ? 'GO' : formatSeconds(secondsRemaining)}
        </span>
      </div>
    </div>
  );
}
