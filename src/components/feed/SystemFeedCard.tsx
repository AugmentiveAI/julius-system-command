import { FeedItem } from '@/types/systemFeed';
import { formatDistanceToNow } from 'date-fns';

interface SystemFeedCardProps {
  item: FeedItem;
  onAction?: () => void;
  onDismiss?: () => void;
}

const TYPE_INDICATORS: Record<string, { dot: string; label: string }> = {
  insight: { dot: 'bg-primary', label: 'INSIGHT' },
  warning: { dot: 'bg-yellow-500', label: 'WARNING' },
  tactic: { dot: 'bg-emerald-500', label: 'NEW TACTIC' },
  shadow_intel: { dot: 'bg-secondary', label: 'SHADOW INTEL' },
  milestone: { dot: 'bg-amber-500', label: 'MILESTONE' },
  system_status: { dot: 'bg-primary/60', label: 'STATUS' },
  penalty: { dot: 'bg-destructive', label: 'PENALTY' },
  directive: { dot: 'bg-primary', label: 'DIRECTIVE' },
  mission_batch: { dot: 'bg-primary', label: 'MISSIONS' },
};

export function SystemFeedCard({ item, onAction, onDismiss }: SystemFeedCardProps) {
  const indicator = TYPE_INDICATORS[item.type] ?? TYPE_INDICATORS.insight;
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }); }
    catch { return ''; }
  })();

  return (
    <div className="flex gap-3 py-3 border-b border-border/20 last:border-0 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <span className={`h-2 w-2 rounded-full ${indicator.dot}`} />
        <span className="w-px flex-1 bg-border/20 mt-1" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[8px] tracking-[0.2em] text-muted-foreground uppercase">
            {indicator.label}
          </span>
          {timeAgo && (
            <span className="font-mono text-[8px] text-muted-foreground/50">{timeAgo}</span>
          )}
        </div>
        <p className="font-mono text-xs text-foreground/80 leading-relaxed">{item.body}</p>
        {item.action && onAction && (
          <button
            onClick={onAction}
            className="mt-1 font-mono text-[9px] tracking-wider text-primary hover:text-primary/80 transition-colors"
          >
            {item.action.label} →
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-muted-foreground text-[10px] shrink-0 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
}
