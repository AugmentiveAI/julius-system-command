import { Cornerstone } from '@/types/cornerstone';
import { Shield, ShieldCheck, ShieldAlert, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface CornerstoneCardProps {
  cornerstone: Cornerstone | null;
  todayHonored: boolean;
}

export function CornerstoneCard({ cornerstone, todayHonored }: CornerstoneCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!cornerstone) return null;

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      todayHonored
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-destructive/30 bg-destructive/5 animate-pulse'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          {todayHonored ? (
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
          )}
          <div className="text-left">
            <p className="font-mono text-[9px] tracking-wider text-amber-400 uppercase">
              Cornerstone
            </p>
            <p className="font-mono text-xs text-foreground mt-0.5">
              {cornerstone.behavior}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-[9px] ${todayHonored ? 'text-emerald-400' : 'text-destructive'}`}>
            {todayHonored ? '✓ Protected' : '⚠ At Risk'}
          </span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-background/50 p-2 text-center">
              <p className="font-mono text-sm font-bold text-emerald-400">{cornerstone.successCorrelation}%</p>
              <p className="font-mono text-[8px] text-muted-foreground tracking-wider">GOOD DAYS WITH</p>
            </div>
            <div className="rounded-md bg-background/50 p-2 text-center">
              <p className="font-mono text-sm font-bold text-destructive">{cornerstone.absenceCorrelation}%</p>
              <p className="font-mono text-[8px] text-muted-foreground tracking-wider">BAD DAYS WITHOUT</p>
            </div>
          </div>

          <p className="font-mono text-[9px] text-muted-foreground">
            Based on {cornerstone.dataPoints} days of data ({cornerstone.confidence}% confidence)
          </p>

          <p className="font-mono text-[9px] text-amber-400/80 italic">
            {cornerstone.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}
