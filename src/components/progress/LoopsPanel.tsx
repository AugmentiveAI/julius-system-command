import { NarrativeLoop } from '@/types/narrativeLoop';
import { RefreshCw, TrendingUp, Clock, Zap, AlertTriangle } from 'lucide-react';

const VALENCE_STYLES = {
  positive: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    label: 'text-emerald-400',
    icon: TrendingUp,
    tag: 'STRENGTH',
  },
  negative: {
    border: 'border-destructive/30',
    bg: 'bg-destructive/5',
    label: 'text-destructive',
    icon: AlertTriangle,
    tag: 'PATTERN TO BREAK',
  },
  neutral: {
    border: 'border-secondary/30',
    bg: 'bg-secondary/5',
    label: 'text-secondary',
    icon: RefreshCw,
    tag: 'OBSERVED',
  },
};

interface LoopsPanelProps {
  loops: NarrativeLoop[];
  onBreakLoop?: (loopId: string) => void;
}

export function LoopsPanel({ loops, onBreakLoop }: LoopsPanelProps) {
  const active = loops.filter(l => l.status === 'active');

  if (active.length === 0) {
    return (
      <div className="rounded-lg border border-border/30 bg-card/50 p-4 text-center">
        <p className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
          Narrative Loops
        </p>
        <p className="font-mono text-xs text-muted-foreground mt-2">
          The System is analyzing your patterns. More data required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase px-1">
        Detected Patterns ({active.length})
      </p>
      {active.map((loop) => {
        const style = VALENCE_STYLES[loop.valence];
        const Icon = style.icon;

        return (
          <div
            key={loop.id}
            className={`rounded-lg border ${style.border} ${style.bg} p-3`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${style.label} shrink-0`} />
                <div>
                  <span className={`font-mono text-[8px] tracking-wider ${style.label} uppercase`}>
                    {style.tag}
                  </span>
                  <p className="font-mono text-xs text-foreground mt-0.5">
                    {loop.pattern}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                {loop.confidence}%
              </span>
            </div>

            {loop.breakStrategy && loop.valence === 'negative' && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <p className="font-mono text-[9px] text-muted-foreground">
                  <span className="text-primary">Strategy:</span> {loop.breakStrategy}
                </p>
                {onBreakLoop && (
                  <button
                    onClick={() => onBreakLoop(loop.id)}
                    className="mt-1.5 px-2.5 py-1 rounded border border-primary/30 bg-primary/10 font-mono text-[9px] text-primary tracking-wider hover:bg-primary/20 transition-colors"
                  >
                    MARK AS BROKEN
                  </button>
                )}
              </div>
            )}

            {loop.evidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/20 space-y-0.5">
                {loop.evidence.slice(0, 2).map((e, i) => (
                  <p key={i} className="font-mono text-[9px] text-muted-foreground">
                    • {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
