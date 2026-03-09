import { Shield, Flame, Zap, Clock, TrendingDown, AlertTriangle, Skull, Target } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Threat, ThreatCategory, ThreatLevel } from '@/types/threat';

const LEVEL_CONFIG: Record<ThreatLevel, { dot: string; label: string; pulse: string }> = {
  nominal: {
    dot: 'bg-green-500',
    label: 'NOMINAL',
    pulse: '',
  },
  elevated: {
    dot: 'bg-yellow-500',
    label: 'ELEVATED',
    pulse: 'animate-pulse',
  },
  high: {
    dot: 'bg-orange-500',
    label: 'HIGH',
    pulse: 'animate-pulse',
  },
  critical: {
    dot: 'bg-red-500 shadow-[0_0_12px_hsl(0_84%_60%/0.7)]',
    label: 'CRITICAL',
    pulse: 'animate-ping',
  },
};

const CATEGORY_ICONS: Record<ThreatCategory, typeof Shield> = {
  streak: Flame,
  fatigue: TrendingDown,
  pipeline: Target,
  genetic: Zap,
  momentum: TrendingDown,
  stat_decay: AlertTriangle,
  deadline: Clock,
  penalty: Skull,
};

const LEVEL_BADGE_COLORS: Record<ThreatLevel, string> = {
  nominal: 'bg-green-500/20 text-green-400',
  elevated: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
};

interface ThreatIndicatorProps {
  overallLevel: ThreatLevel;
  threats: Threat[];
}

export function ThreatIndicator({ overallLevel, threats }: ThreatIndicatorProps) {
  const config = LEVEL_CONFIG[overallLevel];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-muted/50">
          <span className="relative flex h-2.5 w-2.5">
            {overallLevel !== 'nominal' && (
              <span className={`absolute inset-0 rounded-full ${config.dot} ${config.pulse} opacity-75`} />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dot}`} />
          </span>
          <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
            {config.label}
          </span>
          {threats.length > 0 && (
            <span className="font-mono text-[10px] text-muted-foreground/60">
              ({threats.length})
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <p className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
            Threat Assessment
          </p>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${LEVEL_BADGE_COLORS[overallLevel]}`}>
            {config.label}
          </span>
        </div>

        {threats.length === 0 ? (
          <div className="flex items-center gap-2 py-2 text-muted-foreground">
            <Shield className="h-4 w-4 text-green-500" />
            <span>All systems nominal.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {threats.map((threat) => {
              const Icon = CATEGORY_ICONS[threat.category] || AlertTriangle;
              const badgeColor = LEVEL_BADGE_COLORS[threat.level];
              return (
                <div key={threat.id} className="space-y-1 rounded-md border border-border/50 bg-muted/30 p-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-bold text-foreground">{threat.title}</span>
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold ${badgeColor}`}>
                      {threat.level.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{threat.description}</p>
                  <p className="font-mono text-[10px] text-primary">{threat.metric}</p>
                  <p className="text-[10px] text-muted-foreground/80 italic">{threat.recommendation}</p>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
