import { AlertTriangle, X, Skull } from 'lucide-react';
import { PenaltyLevel } from '@/types/player';

interface PenaltyBannerProps {
  penaltyLevel: PenaltyLevel;
  onDismiss: () => void;
  isDismissed: boolean;
}

const PENALTY_CONFIG = {
  1: {
    title: 'Penalty Warning',
    description: 'Zero quests completed yesterday. Complete a quest to avoid stat reduction.',
    bgClass: 'bg-yellow-500/10 border-yellow-500/50',
    textClass: 'text-yellow-400',
    iconClass: 'text-yellow-400',
    Icon: AlertTriangle,
  },
  2: {
    title: 'Penalty Zone Active',
    description: 'Two consecutive days with zero quests. Lowest stat reduced. Complete a quest to escape.',
    bgClass: 'bg-red-500/10 border-red-500/50',
    textClass: 'text-red-400',
    iconClass: 'text-red-400',
    Icon: AlertTriangle,
  },
  3: {
    title: 'SYSTEM WARNING',
    description: 'Critical failure. Three consecutive days inactive. Severe stat penalty applied.',
    bgClass: 'bg-red-600/20 border-red-600',
    textClass: 'text-red-500',
    iconClass: 'text-red-500',
    Icon: Skull,
  },
};

export const PenaltyBanner = ({ penaltyLevel, onDismiss, isDismissed }: PenaltyBannerProps) => {
  if (penaltyLevel === 0 || isDismissed) return null;

  const config = PENALTY_CONFIG[penaltyLevel];
  const { Icon } = config;

  return (
    <div
      className={`relative rounded-lg border p-4 ${config.bgClass}`}
      style={
        penaltyLevel === 3
          ? { boxShadow: '0 0 20px hsl(0 84% 50% / 0.3)', animation: 'pulse 2s infinite' }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${config.iconClass}`} />
        <div className="flex-1">
          <h3 className={`font-display text-sm font-bold uppercase tracking-wider ${config.textClass}`}>
            {config.title}
          </h3>
          <p className="mt-1 font-tech text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
