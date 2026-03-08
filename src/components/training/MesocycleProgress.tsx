import { MesocycleState } from '@/utils/periodizationEngine';

interface MesocycleProgressProps {
  mesocycle: MesocycleState;
}

const PHASE_COLORS: Record<string, string> = {
  accumulation: 'bg-primary',
  intensification: 'bg-amber-500',
  deload: 'bg-blue-400',
};

const PHASE_LABELS: Record<string, string> = {
  accumulation: 'ACC',
  intensification: 'INT',
  deload: 'DLD',
};

export function MesocycleProgress({ mesocycle }: MesocycleProgressProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Mesocycle
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          RPE Target: {mesocycle.intensityTarget}
        </span>
      </div>

      {/* Week blocks */}
      <div className="flex gap-1">
        {Array.from({ length: mesocycle.totalWeeks }, (_, i) => {
          const weekNum = i + 1;
          const isCurrent = weekNum === mesocycle.currentWeek;
          const isPast = weekNum < mesocycle.currentWeek;
          // Determine phase for this week
          const phase = weekNum === mesocycle.totalWeeks ? 'deload' :
                        weekNum >= Math.ceil(mesocycle.totalWeeks * 0.75) ? 'intensification' :
                        'accumulation';

          return (
            <div
              key={weekNum}
              className={`flex-1 rounded-md py-1.5 text-center transition-all ${
                isCurrent
                  ? `${PHASE_COLORS[phase]} text-white ring-2 ring-white/20`
                  : isPast
                  ? `${PHASE_COLORS[phase]}/30 text-muted-foreground`
                  : 'bg-muted/30 text-muted-foreground/50'
              }`}
            >
              <p className="font-mono text-[9px] font-bold">W{weekNum}</p>
              <p className="font-mono text-[8px]">{PHASE_LABELS[phase]}</p>
            </div>
          );
        })}
      </div>

      {/* Current phase label */}
      <div className="flex items-center justify-between">
        <span className="font-tech text-xs text-foreground/70 capitalize">
          {mesocycle.phase} phase
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          Vol: {Math.round(mesocycle.volumeMultiplier * 100)}%
        </span>
      </div>
    </div>
  );
}
