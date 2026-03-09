import { EmergencyQuest } from '@/types/emergencyQuest';
import { AlertTriangle, Zap, Clock, Target, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  quest: EmergencyQuest;
  show: boolean;
  onAccept: () => void;
}

export function EmergencyQuestOverlay({ quest, show, onAccept }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) setTimeout(() => setVisible(true), 50);
    else setVisible(false);
  }, [show]);

  if (!show) return null;

  const isOpportunity = quest.isOpportunity;
  const Icon = isOpportunity ? Zap : AlertTriangle;

  const timeStr = quest.timeLimit
    ? `${quest.timeLimit} minutes`
    : 'Until midnight';

  return (
    <div className={cn(
      'fixed inset-0 z-[200] flex items-center justify-center bg-black/90 transition-opacity duration-500',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      {/* Pulsing border effect */}
      <div className={cn(
        'absolute inset-2 rounded-xl border-2 pointer-events-none',
        isOpportunity
          ? 'border-primary/60 animate-pulse'
          : 'border-destructive/60 animate-pulse',
      )} style={{
        boxShadow: isOpportunity
          ? '0 0 40px hsl(var(--primary) / 0.3), inset 0 0 40px hsl(var(--primary) / 0.1)'
          : '0 0 40px hsl(var(--destructive) / 0.3), inset 0 0 40px hsl(var(--destructive) / 0.1)',
      }} />

      <div className="relative z-10 mx-6 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-bold tracking-[0.2em] uppercase',
            isOpportunity
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'bg-destructive/20 text-destructive border border-destructive/40'
          )}>
            <Icon className="h-3.5 w-3.5" />
            {isOpportunity ? 'SURGE DETECTED' : 'EMERGENCY PROTOCOL'}
          </div>

          <h1 className={cn(
            'font-mono text-2xl font-black tracking-tight',
            isOpportunity ? 'text-primary' : 'text-destructive'
          )}>
            {quest.title}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {quest.description}
          </p>
        </div>

        {/* Quest Details */}
        <div className="space-y-3 rounded-lg border border-border/50 bg-card/50 p-4">
          {/* Difficulty + XP */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded font-mono text-xs font-black border',
                quest.difficulty === 'S'
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                  : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
              )}>
                {quest.difficulty}
              </span>
              <span className="font-mono text-xs text-muted-foreground">Rank</span>
            </div>
            <span className="font-mono text-sm font-bold text-primary">+{quest.xpReward} XP</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{timeStr}</span>
          </div>

          {/* Stat reward */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">
              +{quest.statReward.amount} {quest.statReward.stat.charAt(0).toUpperCase() + quest.statReward.stat.slice(1)}
            </span>
          </div>

          {/* Objectives */}
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <span className="font-mono text-[10px] text-muted-foreground tracking-wider">OBJECTIVES</span>
            {quest.objectives.map(obj => (
              <div key={obj.id} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-muted-foreground mt-0.5">○</span>
                <span>{obj.description}</span>
              </div>
            ))}
          </div>

          {/* Penalty warning */}
          {quest.penalty && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 mt-2">
              <Skull className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="font-mono text-[11px] text-destructive">
                FAILURE: {quest.penalty.type === 'stat_loss' && quest.penalty.stat
                  ? `-${quest.penalty.amount} ${quest.penalty.stat.charAt(0).toUpperCase() + quest.penalty.stat.slice(1)}`
                  : quest.penalty.type === 'streak_reset'
                    ? 'Streak Reset'
                    : `-${quest.penalty.amount} XP`
                }
              </span>
            </div>
          )}
        </div>

        {/* Accept Button */}
        <Button
          onClick={onAccept}
          className={cn(
            'w-full font-mono font-bold tracking-wider text-sm h-12',
            isOpportunity
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
              : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
          )}
        >
          {isOpportunity ? '⚡ ACCEPT SURGE' : '⚔️ ACCEPT MISSION'}
        </Button>

        {isOpportunity && (
          <p className="text-center text-[10px] text-muted-foreground font-mono">
            Optional — no penalty for declining
          </p>
        )}
      </div>
    </div>
  );
}
