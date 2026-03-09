import { NarrativeLoop } from '@/types/narrativeLoop';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface LoopDetectedOverlayProps {
  loop: NarrativeLoop | null;
  onAcknowledge: () => void;
}

export function LoopDetectedOverlay({ loop, onAcknowledge }: LoopDetectedOverlayProps) {
  if (!loop) return null;

  const isNegative = loop.valence === 'negative';
  const isPositive = loop.valence === 'positive';

  const borderColor = isNegative
    ? 'border-destructive/50'
    : isPositive
    ? 'border-emerald-500/50'
    : 'border-secondary/50';

  const accentColor = isNegative
    ? 'text-destructive'
    : isPositive
    ? 'text-emerald-400'
    : 'text-secondary';

  const Icon = isNegative ? AlertTriangle : isPositive ? TrendingUp : RefreshCw;

  return (
    <Dialog open={!!loop} onOpenChange={() => onAcknowledge()}>
      <DialogContent className={`max-w-sm border-2 ${borderColor} bg-card p-0 gap-0`}>
        {/* Header */}
        <div className="p-5 text-center border-b border-border/30">
          <div className="mx-auto w-10 h-10 rounded-full bg-background/50 flex items-center justify-center mb-3">
            <Icon className={`w-5 h-5 ${accentColor}`} />
          </div>
          <p className={`font-mono text-[10px] tracking-[0.4em] ${accentColor} uppercase`}>
            Pattern Detected
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <p className="font-mono text-sm text-foreground text-center font-medium">
            {loop.pattern}
          </p>

          <div className="flex items-center justify-center gap-3 text-center">
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{loop.occurrences}x</p>
              <p className="font-mono text-[8px] text-muted-foreground tracking-wider">OCCURRENCES</p>
            </div>
            <div className="w-px h-8 bg-border/30" />
            <div>
              <p className="font-mono text-lg font-bold text-foreground">{loop.confidence}%</p>
              <p className="font-mono text-[8px] text-muted-foreground tracking-wider">CONFIDENCE</p>
            </div>
          </div>

          {/* Evidence */}
          {loop.evidence.length > 0 && (
            <div className="rounded-md bg-background/50 p-3 space-y-1">
              <p className="font-mono text-[9px] text-muted-foreground tracking-wider uppercase mb-1">Evidence</p>
              {loop.evidence.slice(0, 3).map((e, i) => (
                <p key={i} className="font-mono text-[9px] text-muted-foreground">• {e}</p>
              ))}
            </div>
          )}

          {/* Break Strategy */}
          {loop.breakStrategy && isNegative && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <p className="font-mono text-[9px] text-primary tracking-wider uppercase mb-1">Break Strategy</p>
              <p className="font-mono text-xs text-foreground">{loop.breakStrategy}</p>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <div className="p-4 pt-0">
          <button
            onClick={onAcknowledge}
            className={`w-full py-2.5 rounded-md border font-mono text-[10px] tracking-[0.3em] uppercase transition-colors ${
              isNegative
                ? 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            Acknowledged
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
