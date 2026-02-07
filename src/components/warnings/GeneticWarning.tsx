import { Info, AlertTriangle, AlertCircle, X } from 'lucide-react';

type WarningLevel = 'info' | 'warning' | 'danger';

interface GeneticWarningProps {
  level: WarningLevel;
  title: string;
  message: string;
  actionRequired?: string;
  onDismiss?: () => void;
}

const LEVEL_CONFIG: Record<WarningLevel, { icon: React.ElementType; border: string; bg: string; titleColor: string }> = {
  info: {
    icon: Info,
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    titleColor: 'text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    titleColor: 'text-yellow-400',
  },
  danger: {
    icon: AlertCircle,
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    titleColor: 'text-red-400',
  },
};

export const GeneticWarning = ({ level, title, message, actionRequired, onDismiss }: GeneticWarningProps) => {
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  return (
    <div className={`relative flex gap-3 rounded-lg border p-4 ${config.border} ${config.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${config.titleColor}`} />

      <div className="flex-1 space-y-1">
        <h4 className={`font-display text-sm font-bold ${config.titleColor}`}>{title}</h4>
        <p className="font-tech text-xs text-muted-foreground">{message}</p>
        {actionRequired && (
          <p className="font-tech text-xs font-bold text-foreground">
            → {actionRequired}
          </p>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
