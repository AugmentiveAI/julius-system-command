import { EmergencyQuest } from '@/types/emergencyQuest';
import { AlertTriangle, Zap, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { hapticTap } from '@/utils/haptics';

interface Props {
  quest: EmergencyQuest;
  onCompleteObjective: (id: string) => void;
}

export function EmergencyQuestBanner({ quest, onCompleteObjective }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const isOpportunity = quest.isOpportunity;

  useEffect(() => {
    const update = () => {
      const diff = new Date(quest.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [quest.expiresAt]);

  const completedCount = quest.objectives.filter(o => o.completed).length;
  const totalCount = quest.objectives.length;
  const Icon = isOpportunity ? Zap : AlertTriangle;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 transition-all cursor-pointer',
        isOpportunity
          ? 'border-primary/50 bg-primary/5'
          : 'border-destructive/50 bg-destructive/5',
      )}
      style={{
        boxShadow: isOpportunity
          ? '0 0 20px hsl(var(--primary) / 0.15)'
          : '0 0 20px hsl(var(--destructive) / 0.15)',
        animation: 'pulse 3s ease-in-out infinite',
      }}
      onClick={() => { setExpanded(e => !e); hapticTap(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'h-4 w-4',
            isOpportunity ? 'text-primary' : 'text-destructive'
          )} />
          <span className={cn(
            'font-mono text-xs font-bold tracking-wider',
            isOpportunity ? 'text-primary' : 'text-destructive'
          )}>
            {quest.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={cn(
              'font-mono text-[10px] font-bold',
              timeLeft === 'EXPIRED' ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
          <p className="text-xs text-muted-foreground">{quest.description}</p>

          <div className="space-y-1.5">
            {quest.objectives.map(obj => (
              <button
                key={obj.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!obj.completed) {
                    onCompleteObjective(obj.id);
                    hapticTap();
                  }
                }}
                disabled={obj.completed}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-all',
                  obj.completed
                    ? 'bg-primary/10 text-primary/70 line-through'
                    : 'bg-muted/50 text-foreground hover:bg-muted'
                )}
              >
                {obj.completed ? (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 rounded-sm border border-muted-foreground/50 shrink-0" />
                )}
                {obj.description}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[10px] text-primary">
              +{quest.xpReward} XP · +{quest.statReward.amount} {quest.statReward.stat}
            </span>
            {quest.penalty && (
              <span className="font-mono text-[10px] text-destructive">
                Fail: -{quest.penalty.amount} {quest.penalty.stat ?? quest.penalty.type}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
