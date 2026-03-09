import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WeeklyAAR, DayGrade } from '@/types/afterActionReview';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Award } from 'lucide-react';

const GRADE_COLORS: Record<DayGrade, string> = {
  S: 'text-amber-400 bg-amber-400/10 border-amber-400/40',
  A: 'text-primary bg-primary/10 border-primary/40',
  B: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/40',
  C: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40',
  D: 'text-orange-400 bg-orange-400/10 border-orange-400/40',
  F: 'text-destructive bg-destructive/10 border-destructive/40',
};

const MINI_GRADE: Record<DayGrade, string> = {
  S: 'bg-amber-400/20 text-amber-400',
  A: 'bg-primary/20 text-primary',
  B: 'bg-emerald-400/20 text-emerald-400',
  C: 'bg-yellow-400/20 text-yellow-400',
  D: 'bg-orange-400/20 text-orange-400',
  F: 'bg-destructive/20 text-destructive',
};

interface WeeklyAARModalProps {
  aar: WeeklyAAR | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeeklyAARModal({ aar, open, onOpenChange }: WeeklyAARModalProps) {
  if (!aar) return null;

  const gradeStyle = GRADE_COLORS[aar.weekGrade];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border/50 bg-card p-0 gap-0 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-secondary uppercase">
                Weekly Debrief
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                {aar.weekStart} — {aar.weekEnd}
              </p>
            </div>
            <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center font-display text-2xl font-bold ${gradeStyle}`}>
              {aar.weekGrade}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-px bg-border/20 border-b border-border/30">
          {[
            { val: aar.totalXP, label: 'XP' },
            { val: aar.totalQuestsCompleted, label: 'QUESTS' },
            { val: aar.activeDays, label: 'ACTIVE' },
            { val: aar.streakLength, label: 'STREAK' },
          ].map(m => (
            <div key={m.label} className="bg-card p-2.5 text-center">
              <p className="font-mono text-sm font-bold text-foreground">{m.val}</p>
              <p className="font-mono text-[8px] text-muted-foreground tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {/* Summary */}
          <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
            <p className="font-mono text-[9px] tracking-wider text-secondary uppercase mb-1">Week Summary</p>
            <p className="font-mono text-xs text-foreground">{aar.weekSummary}</p>
          </div>

          {/* Best/Worst */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span className="font-mono text-[8px] text-emerald-400 tracking-wider">BEST DAY</span>
              </div>
              <p className="font-mono text-xs text-foreground">{aar.bestDay.grade}-Rank</p>
              <p className="font-mono text-[9px] text-muted-foreground">{aar.bestDay.xp} XP</p>
            </div>
            <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="w-3 h-3 text-orange-400" />
                <span className="font-mono text-[8px] text-orange-400 tracking-wider">WORST DAY</span>
              </div>
              <p className="font-mono text-xs text-foreground">{aar.worstDay.grade}-Rank</p>
              <p className="font-mono text-[9px] text-muted-foreground">{aar.worstDay.xp} XP</p>
            </div>
          </div>

          {/* Trajectory */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3 h-3 text-primary" />
              <span className="font-mono text-[9px] text-primary tracking-wider uppercase">Trajectory</span>
            </div>
            <p className="font-mono text-xs text-foreground">{aar.trajectoryUpdate}</p>
          </div>

          {/* Next Week Focus */}
          <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-3 h-3 text-secondary" />
              <span className="font-mono text-[9px] text-secondary tracking-wider uppercase">Next Week Focus</span>
            </div>
            <p className="font-mono text-xs text-foreground">{aar.nextWeekFocus}</p>
          </div>

          {/* Pattern Alert */}
          {aar.patternAlert && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="font-mono text-[9px] text-yellow-400 tracking-wider uppercase mb-1">⚠ Pattern Alert</p>
              <p className="font-mono text-xs text-foreground">{aar.patternAlert}</p>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <div className="p-4 pt-0">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 rounded-md border border-secondary/30 bg-secondary/10 font-mono text-[10px] tracking-[0.3em] text-secondary uppercase hover:bg-secondary/20 transition-colors"
          >
            Begin Next Week
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
