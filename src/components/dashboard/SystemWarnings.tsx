import { SystemWarning } from '@/utils/systemIntelligence';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface SystemWarningsProps {
  warnings: SystemWarning[];
}

const LEVEL_CONFIG = {
  critical: {
    icon: AlertCircle,
    border: 'border-destructive/40',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    pulse: true,
  },
  caution: {
    icon: AlertTriangle,
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    pulse: true,
  },
  info: {
    icon: Info,
    border: 'border-primary/30',
    bg: 'bg-primary/10',
    text: 'text-primary',
    pulse: false,
  },
};

export function SystemWarnings({ warnings }: SystemWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm">🚨</span>
        <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">SYSTEM WARNINGS</span>
      </div>
      {warnings.map((warning, i) => {
        const config = LEVEL_CONFIG[warning.level];
        const Icon = config.icon;
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg border p-4 ${config.border} ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}
            style={config.pulse ? { animationDuration: '3s' } : undefined}
          >
            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.text}`} />
            <p className={`font-mono text-xs leading-relaxed ${config.text}`}>
              {warning.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
