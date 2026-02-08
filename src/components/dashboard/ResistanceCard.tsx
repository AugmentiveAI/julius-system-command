import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Swords, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { loadCachedResistance, ResistanceAnalysis, ResistancePoint, StrengthPoint } from '@/utils/resistanceTracker';

const SCORE_TIERS = [
  { max: 20, color: 'text-green-400', barColor: 'bg-green-500', label: 'The System is pleased. Minimal resistance detected.' },
  { max: 50, color: 'text-yellow-400', barColor: 'bg-yellow-500', label: 'Resistance detected. The System is adapting.' },
  { max: 75, color: 'text-orange-400', barColor: 'bg-orange-500', label: 'Significant avoidance patterns. The System is escalating.' },
  { max: 100, color: 'text-red-400', barColor: 'bg-red-500', label: 'Critical resistance. The System will not be ignored.' },
];

function getScoreTier(score: number) {
  return SCORE_TIERS.find(t => score <= t.max) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

const PATTERN_LABELS: Record<string, string> = {
  category_avoidance: 'Category Avoidance',
  difficulty_avoidance: 'Difficulty Avoidance',
  time_avoidance: 'Time Avoidance',
  comfort_zone_lock: 'Comfort Zone Lock',
  streak_sabotage: 'Streak Sabotage',
  hard_avoidance: 'Hard Avoidance',
};

function ResistanceCard({ point }: { point: ResistancePoint }) {
  const isHigh = point.avoidanceRate >= 70;
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${
      isHigh ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-3.5 w-3.5 ${isHigh ? 'text-red-400' : 'text-amber-400'}`} />
          <span className={`font-mono text-xs font-bold ${isHigh ? 'text-red-400' : 'text-amber-400'}`}>
            {point.category}
          </span>
        </div>
        <span className={`font-mono text-xs ${isHigh ? 'text-red-400' : 'text-amber-400'}`}>
          {point.avoidanceRate}% avoidance
        </span>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        {PATTERN_LABELS[point.pattern] || point.pattern}
      </p>
      <p className="font-mono text-[10px] text-muted-foreground italic leading-relaxed">
        "{point.systemStrategy}"
      </p>
      <Progress
        value={Math.max(0, 100 - point.avoidanceRate)}
        className={`h-1 bg-muted ${isHigh ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'}`}
      />
    </div>
  );
}

function StrengthCard({ point }: { point: StrengthPoint }) {
  const isMastered = point.completionRate >= 90;
  return (
    <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-green-400" />
          <span className="font-mono text-xs font-bold text-green-400">
            {point.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isMastered && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-green-500/50 bg-green-500/20 text-green-400">
              MASTERED
            </span>
          )}
          <span className="font-mono text-xs text-green-400">
            {point.completionRate}%
          </span>
        </div>
      </div>
      <Progress value={point.completionRate} className="h-1 bg-muted [&>div]:bg-green-500" />
    </div>
  );
}

export function ResistanceCard2() {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<ResistanceAnalysis | null>(null);

  useEffect(() => {
    setAnalysis(loadCachedResistance());
  }, []);

  // If no analysis exists yet, show a minimal placeholder
  if (!analysis) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">
            ⚔️ RESISTANCE POINTS
          </span>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground italic">
          Insufficient data. The System is observing.
        </p>
      </div>
    );
  }

  const tier = getScoreTier(analysis.overallResistanceScore);
  const topResistance = analysis.resistancePoints.slice(0, 3);
  const topStrengths = analysis.strengthPoints.slice(0, 3);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs tracking-[0.15em] text-muted-foreground">
                ⚔️ RESISTANCE POINTS
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm font-bold ${tier.color}`}>
                  {analysis.overallResistanceScore}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">/100</span>
              </div>
              {topResistance.length > 0 && !isOpen && (
                <span className="font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">
                  {topResistance[0].category}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Always-visible score bar */}
        <div className="px-4 pb-3">
          <Progress
            value={analysis.overallResistanceScore}
            className={`h-1.5 bg-muted [&>div]:${tier.barColor}`}
          />
          <p className={`mt-1.5 font-mono text-[10px] ${tier.color}`}>
            {tier.label}
          </p>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Resistance Points */}
            {topResistance.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-red-400 rotate-180" />
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground">WEAK POINTS</span>
                </div>
                {topResistance.map((point, i) => (
                  <ResistanceCard key={i} point={point} />
                ))}
              </div>
            )}

            {/* Strength Points */}
            {topStrengths.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <span className="font-mono text-[10px] tracking-wider text-muted-foreground">STRENGTH POINTS</span>
                </div>
                {topStrengths.map((point, i) => (
                  <StrengthCard key={i} point={point} />
                ))}
              </div>
            )}

            {topResistance.length === 0 && topStrengths.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground italic text-center py-2">
                No significant patterns detected yet.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
