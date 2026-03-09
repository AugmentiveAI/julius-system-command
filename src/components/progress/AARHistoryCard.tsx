import { DailyAAR, DayGrade } from '@/types/afterActionReview';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const GRADE_BG: Record<DayGrade, string> = {
  S: 'bg-amber-400/20 text-amber-400',
  A: 'bg-primary/20 text-primary',
  B: 'bg-emerald-400/20 text-emerald-400',
  C: 'bg-yellow-400/20 text-yellow-400',
  D: 'bg-orange-400/20 text-orange-400',
  F: 'bg-destructive/20 text-destructive',
};

interface AARHistoryCardProps {
  history: DailyAAR[];
  onSelectDay?: (aar: DailyAAR) => void;
}

export function AARHistoryCard({ history, onSelectDay }: AARHistoryCardProps) {
  const last7 = history.slice(-7);

  if (last7.length === 0) {
    return (
      <div className="rounded-lg border border-border/30 bg-card/50 p-4 text-center">
        <p className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
          Performance Reviews
        </p>
        <p className="font-mono text-xs text-muted-foreground mt-2">
          Daily reviews generate at 9pm. Check back tonight.
        </p>
      </div>
    );
  }

  // Calculate trend
  const grades: Record<DayGrade, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const firstHalf = last7.slice(0, Math.ceil(last7.length / 2));
  const secondHalf = last7.slice(Math.ceil(last7.length / 2));
  const firstAvg = firstHalf.reduce((s, a) => s + grades[a.dayGrade], 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, a) => s + grades[a.dayGrade], 0) / secondHalf.length;
  const trend = secondAvg > firstAvg + 0.3 ? 'up' : secondAvg < firstAvg - 0.3 ? 'down' : 'stable';

  return (
    <div className="rounded-lg border border-border/30 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
          Performance Reviews
        </p>
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
          {trend === 'stable' && <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={`font-mono text-[9px] ${
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 justify-center">
        {last7.map((aar) => (
          <button
            key={aar.id}
            onClick={() => onSelectDay?.(aar)}
            className={`w-9 h-9 rounded-md flex items-center justify-center font-mono text-xs font-bold transition-transform hover:scale-110 ${GRADE_BG[aar.dayGrade]}`}
            title={`${aar.date}: ${aar.dayGrade}-Rank (${aar.xpEarned} XP)`}
          >
            {aar.dayGrade}
          </button>
        ))}
      </div>

      <p className="font-mono text-[9px] text-muted-foreground text-center mt-2">
        Tap a grade to view that day's debrief
      </p>
    </div>
  );
}
