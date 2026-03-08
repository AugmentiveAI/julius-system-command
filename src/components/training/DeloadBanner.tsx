import { ShieldAlert } from 'lucide-react';
import { DeloadDecision } from '@/utils/periodizationEngine';

interface DeloadBannerProps {
  decision: DeloadDecision;
}

export function DeloadBanner({ decision }: DeloadBannerProps) {
  if (!decision.shouldDeload) return null;

  return (
    <div
      className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-2"
      style={{ boxShadow: '0 0 15px hsl(38 92% 50% / 0.15)' }}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
        <span className="font-display text-sm font-bold uppercase tracking-wider text-amber-400">
          System Override: Deload
        </span>
      </div>
      <p className="font-tech text-sm text-foreground/80">
        {decision.reason}
      </p>
      <p className="font-mono text-[10px] text-amber-400/70 uppercase tracking-wider">
        Volume reduced. Do not override.
      </p>
    </div>
  );
}
