import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { TrendingUp, Target, Zap, Crown } from 'lucide-react';
import { useTrajectoryData, Milestone } from '@/hooks/useTrajectoryData';
import { SystemIntelligence } from '@/types/systemIntelligence';

const TRACK_COLORS = {
  currentPace: 'hsl(215, 20%, 45%)',       // muted gray-blue
  optimizedPace: 'hsl(187, 100%, 50%)',     // primary cyan
  ceiling: 'hsl(263, 91%, 66%)',            // secondary purple
};

const TRACK_FILLS = {
  currentPace: 'hsl(215, 20%, 45%, 0.05)',
  optimizedPace: 'hsl(187, 100%, 50%, 0.08)',
  ceiling: 'hsl(263, 91%, 66%, 0.06)',
};

function formatXP(xp: number): string {
  if (xp >= 100000) return `${(xp / 1000).toFixed(0)}K`;
  if (xp >= 10000) return `${(xp / 1000).toFixed(1)}K`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return xp.toString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm p-3 shadow-lg">
      <p className="font-mono text-[9px] text-muted-foreground mb-2">Day {label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-mono text-[9px] text-muted-foreground">{
            entry.dataKey === 'currentPace' ? 'Current' :
            entry.dataKey === 'optimizedPace' ? 'Optimized' : 'Ceiling'
          }</span>
          <span className="font-mono text-[10px] text-foreground ml-auto">{formatXP(entry.value)} XP</span>
        </div>
      ))}
    </div>
  );
}

function MilestoneTag({ milestone }: { milestone: Milestone }) {
  const colors = {
    currentPace: 'border-muted-foreground/30 text-muted-foreground bg-muted/20',
    optimizedPace: 'border-primary/30 text-primary bg-primary/10',
    ceiling: 'border-secondary/30 text-secondary bg-secondary/10',
  };
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${colors[milestone.track]}`}>
      {milestone.track === 'ceiling' && <Crown className="h-2.5 w-2.5" />}
      <span className="font-mono text-[8px]">{milestone.label}</span>
      <span className="font-mono text-[7px] opacity-60">D{milestone.day}</span>
    </div>
  );
}

interface TrajectoryForecasterProps {
  intelligence: SystemIntelligence | null;
}

export function TrajectoryForecaster({ intelligence }: TrajectoryForecasterProps) {
  const trajectory = useTrajectoryData();

  if (trajectory.loading) {
    return (
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="h-40 flex items-center justify-center">
          <span className="font-mono text-[10px] text-muted-foreground animate-pulse">Projecting trajectory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="rounded-lg border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[9px] tracking-wider text-muted-foreground">90-DAY PROJECTION</span>
          </div>
          <span className="font-mono text-[8px] text-muted-foreground/50">Day {trajectory.currentDay}</span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectory.points} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TRACK_COLORS.currentPace} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={TRACK_COLORS.currentPace} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOptimized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TRACK_COLORS.optimizedPace} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={TRACK_COLORS.optimizedPace} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCeiling" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TRACK_COLORS.ceiling} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={TRACK_COLORS.ceiling} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 8, fill: 'hsl(215, 20%, 45%)' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(240, 15%, 20%)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: 'hsl(215, 20%, 45%)' }}
                tickFormatter={formatXP}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Current Pace - bottom layer */}
              <Area
                type="monotone"
                dataKey="currentPace"
                stroke={TRACK_COLORS.currentPace}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#gradCurrent)"
                dot={false}
              />
              
              {/* Optimized Pace - middle layer */}
              <Area
                type="monotone"
                dataKey="optimizedPace"
                stroke={TRACK_COLORS.optimizedPace}
                strokeWidth={2}
                fill="url(#gradOptimized)"
                dot={false}
              />
              
              {/* Ceiling - top layer */}
              <Area
                type="monotone"
                dataKey="ceiling"
                stroke={TRACK_COLORS.ceiling}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                fill="url(#gradCeiling)"
                dot={false}
              />

              {/* Milestone markers */}
              {trajectory.milestones.slice(0, 4).map((m, i) => {
                const point = trajectory.points.find(p => p.day >= m.day);
                if (!point) return null;
                return (
                  <ReferenceDot
                    key={i}
                    x={point.day}
                    y={point[m.track]}
                    r={3}
                    fill={TRACK_COLORS[m.track]}
                    stroke="hsl(240, 20%, 4%)"
                    strokeWidth={2}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TRACK_COLORS.currentPace, opacity: 0.6 }} />
            <span className="font-mono text-[8px] text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TRACK_COLORS.optimizedPace }} />
            <span className="font-mono text-[8px] text-primary/80">Optimized</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TRACK_COLORS.ceiling }} />
            <span className="font-mono text-[8px] text-secondary/80">Ceiling</span>
          </div>
        </div>
      </div>

      {/* Pace Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card/40 p-2.5 text-center">
          <p className="font-mono text-[7px] tracking-wider text-muted-foreground/60 uppercase">Current</p>
          <p className="font-mono text-sm text-muted-foreground">{trajectory.dailyXPAvg}</p>
          <p className="font-mono text-[7px] text-muted-foreground/40">XP/day</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-center">
          <p className="font-mono text-[7px] tracking-wider text-primary/60 uppercase">Optimized</p>
          <p className="font-mono text-sm text-primary">{trajectory.optimizedDailyXP}</p>
          <p className="font-mono text-[7px] text-primary/40">XP/day</p>
        </div>
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-2.5 text-center">
          <p className="font-mono text-[7px] tracking-wider text-secondary/60 uppercase">Ceiling</p>
          <p className="font-mono text-sm text-secondary">{trajectory.ceilingDailyXP}</p>
          <p className="font-mono text-[7px] text-secondary/40">XP/day</p>
        </div>
      </div>

      {/* Milestones */}
      {trajectory.milestones.length > 0 && (
        <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-primary/60" />
            <span className="font-mono text-[8px] tracking-wider text-muted-foreground">PROJECTED MILESTONES</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trajectory.milestones.map((m, i) => (
              <MilestoneTag key={i} milestone={m} />
            ))}
          </div>
        </div>
      )}

      {/* AI Strategic Context */}
      {intelligence?.trajectoryForecast && (
        <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2.5">
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
            <Zap className="h-3 w-3 text-primary shrink-0" />
            <div>
              <p className="font-mono text-[8px] tracking-wider text-primary/60 mb-0.5">CRITICAL LEVERAGE</p>
              <p className="font-mono text-[10px] text-foreground leading-relaxed">
                {intelligence.trajectoryForecast.criticalLeverage}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[8px] tracking-wider text-secondary/60">TRUE CEILING</p>
            <p className="font-mono text-[10px] text-foreground/80 leading-relaxed">
              {intelligence.trajectoryForecast.ceiling}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
