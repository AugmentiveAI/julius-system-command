import { FeedItem } from '@/types/systemFeed';
import { AlertTriangle, Zap, Eye } from 'lucide-react';

interface HeroCardProps {
  item: FeedItem;
  onAction?: () => void;
  onDismiss?: () => void;
}

const PRIORITY_STYLES = {
  critical: 'border-l-destructive bg-destructive/5',
  high: 'border-l-yellow-500 bg-yellow-500/5',
  medium: 'border-l-primary bg-primary/5',
  low: 'border-l-muted-foreground/30 bg-card/50',
};

const PRIORITY_ICONS = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: Zap,
  low: Eye,
};

export function HeroCard({ item, onAction, onDismiss }: HeroCardProps) {
  const Icon = PRIORITY_ICONS[item.priority];

  return (
    <div className={`rounded-lg border border-border/50 border-l-[3px] p-4 transition-all ${PRIORITY_STYLES[item.priority]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-4 w-4 ${
            item.priority === 'critical' ? 'text-destructive' :
            item.priority === 'high' ? 'text-yellow-500' : 'text-primary'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase mb-1">
            {item.type === 'directive' ? 'PRIORITY DIRECTIVE' :
             item.type === 'warning' ? 'SYSTEM WARNING' :
             item.type === 'penalty' ? 'PENALTY ALERT' : 'THE SYSTEM'}
          </p>
          <p className="font-tech text-sm text-foreground leading-relaxed">
            {item.body}
          </p>
          {item.action && onAction && (
            <button
              onClick={onAction}
              className="mt-2 font-mono text-[10px] tracking-wider text-primary hover:text-primary/80 transition-colors uppercase"
            >
              → {item.action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground/30 hover:text-muted-foreground text-xs shrink-0"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
