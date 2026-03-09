import { Cornerstone } from '@/types/cornerstone';
import { ShieldAlert } from 'lucide-react';

interface CornerstoneAlertProps {
  cornerstone: Cornerstone;
  todayHonored: boolean;
}

export function CornerstoneAlert({ cornerstone, todayHonored }: CornerstoneAlertProps) {
  if (todayHonored || !cornerstone) return null;

  const now = new Date();
  const hour = now.getHours();

  // Only show alert if it's getting late and cornerstone not honored
  if (hour < 10) return null;

  const urgency = hour >= 14 ? 'critical' : hour >= 11 ? 'high' : 'moderate';

  return (
    <div className={`rounded-lg border p-3 ${
      urgency === 'critical'
        ? 'border-destructive/50 bg-destructive/10 animate-pulse'
        : urgency === 'high'
        ? 'border-orange-500/40 bg-orange-500/5'
        : 'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      <div className="flex items-center gap-2">
        <ShieldAlert className={`w-4 h-4 shrink-0 ${
          urgency === 'critical' ? 'text-destructive' : 'text-orange-400'
        }`} />
        <div>
          <p className={`font-mono text-[9px] tracking-wider uppercase ${
            urgency === 'critical' ? 'text-destructive' : 'text-orange-400'
          }`}>
            Cornerstone at Risk
          </p>
          <p className="font-mono text-xs text-foreground mt-0.5">
            "{cornerstone.behavior}" not yet completed.
          </p>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
            {cornerstone.successCorrelation}% of your best days have this behavior.
          </p>
        </div>
      </div>
    </div>
  );
}
