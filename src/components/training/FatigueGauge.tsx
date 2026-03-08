import { Activity } from 'lucide-react';

interface FatigueGaugeProps {
  accumulation: number;
  threshold?: number;
}

export function FatigueGauge({ accumulation, threshold = 40 }: FatigueGaugeProps) {
  const percentage = Math.min((accumulation / threshold) * 100, 100);
  const isElevated = accumulation > threshold * 0.7;
  const isCritical = accumulation > threshold * 0.875;

  const barColor = isCritical
    ? 'bg-red-500'
    : isElevated
    ? 'bg-amber-500'
    : 'bg-primary';

  const textColor = isCritical
    ? 'text-red-400'
    : isElevated
    ? 'text-amber-400'
    : 'text-muted-foreground';

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className={`h-3.5 w-3.5 ${textColor}`} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            7-Day Fatigue
          </span>
        </div>
        <span className={`font-mono text-xs font-bold ${textColor}`}>
          {accumulation}/{threshold}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status text */}
      {isCritical && (
        <p className="font-mono text-[10px] text-red-400">
          ⚠ Deload imminent. Fatigue accumulation critical.
        </p>
      )}
      {isElevated && !isCritical && (
        <p className="font-mono text-[10px] text-amber-400">
          Fatigue elevated. Monitor closely.
        </p>
      )}
    </div>
  );
}
