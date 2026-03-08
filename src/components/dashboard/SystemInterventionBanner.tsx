import { useEffect, useRef } from 'react';
import { AlertTriangle, Zap, Brain, Shield, ChevronRight, X } from 'lucide-react';
import { SystemIntervention, InterventionPriority } from '@/utils/interventionEngine';
import { useNavigate } from 'react-router-dom';

interface SystemInterventionBannerProps {
  intervention: SystemIntervention | null;
  totalCount: number;
  onDismiss: (id: string) => void;
  onCallback?: (callbackName: string) => void;
}

const PRIORITY_STYLES: Record<InterventionPriority, {
  border: string;
  bg: string;
  icon: string;
  pulse: boolean;
}> = {
  critical: {
    border: 'border-destructive/70',
    bg: 'bg-destructive/10',
    icon: 'text-destructive',
    pulse: true,
  },
  high: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/5',
    icon: 'text-orange-400',
    pulse: false,
  },
  medium: {
    border: 'border-primary/40',
    bg: 'bg-primary/5',
    icon: 'text-primary',
    pulse: false,
  },
  low: {
    border: 'border-muted-foreground/20',
    bg: 'bg-card/80',
    icon: 'text-muted-foreground',
    pulse: false,
  },
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  risk_alert: AlertTriangle,
  genetic_optimization: Brain,
  recovery_mandate: Shield,
  momentum_capture: Zap,
  opportunity_window: Zap,
  pattern_insight: Brain,
  strategic_pivot: Brain,
  accountability_check: AlertTriangle,
  celebration: Zap,
};

export const SystemInterventionBanner = ({
  intervention,
  totalCount,
  onDismiss,
  onCallback,
}: SystemInterventionBannerProps) => {
  const navigate = useNavigate();
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss medium priority after 30 seconds
  useEffect(() => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);

    if (intervention?.priority === 'medium' || intervention?.priority === 'low') {
      autoDismissRef.current = setTimeout(() => {
        if (intervention) onDismiss(intervention.id);
      }, 30_000);
    }

    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [intervention?.id, intervention?.priority, onDismiss]);

  if (!intervention) return null;

  const style = PRIORITY_STYLES[intervention.priority];
  const Icon = TYPE_ICONS[intervention.type] ?? AlertTriangle;

  const handleAction = () => {
    if (intervention.action?.route) {
      navigate(intervention.action.route);
      onDismiss(intervention.id);
    } else if (intervention.action?.callback && onCallback) {
      onCallback(intervention.action.callback);
      onDismiss(intervention.id);
    }
  };

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} backdrop-blur-sm p-3 space-y-2 ${style.pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${style.icon}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] tracking-widest uppercase text-foreground/80 truncate">
              {intervention.title}
            </p>
            {intervention.priority !== 'critical' && (
              <button
                onClick={() => onDismiss(intervention.id)}
                className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground leading-relaxed mt-1">
            {intervention.message}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {intervention.action ? (
          <button
            onClick={handleAction}
            className={`flex items-center gap-1 py-1.5 px-3 rounded-md font-mono text-[10px] tracking-wider border transition-all ${
              intervention.priority === 'critical'
                ? 'border-destructive/50 bg-destructive/20 text-destructive hover:bg-destructive/30'
                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {intervention.action.label}
            <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={() => onDismiss(intervention.id)}
            className="py-1.5 px-3 rounded-md font-mono text-[10px] tracking-wider border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            Acknowledged
          </button>
        )}

        {totalCount > 1 && (
          <span className="font-mono text-[9px] text-muted-foreground/50">
            +{totalCount - 1} more
          </span>
        )}
      </div>
    </div>
  );
};
