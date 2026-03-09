import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DailyAAR, DayGrade } from '@/types/afterActionReview';
import { Trophy, Target, AlertTriangle, ArrowRight, X } from 'lucide-react';

const GRADE_COLORS: Record<DayGrade, string> = {
  S: 'text-amber-400 border-amber-400/50 bg-amber-400/10',
  A: 'text-primary border-primary/50 bg-primary/10',
  B: 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10',
  C: 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10',
  D: 'text-orange-400 border-orange-400/50 bg-orange-400/10',
  F: 'text-destructive border-destructive/50 bg-destructive/10',
};

interface AARModalProps {
  aar: DailyAAR | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AARModal({ aar, open, onOpenChange }: AARModalProps) {
  if (!aar) return null;

  const gradeStyle = GRADE_COLORS[aar.dayGrade];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border/50 bg-card p-0 gap-0">
        {/* Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Daily Debrief
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                {aar.date}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-display text-xl font-bold ${gradeStyle}`}>
              {aar.dayGrade}
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-px bg-border/20 border-b border-border/30">
          <div className="bg-card p-3 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{aar.xpEarned}</p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">XP</p>
          </div>
          <div className="bg-card p-3 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{aar.questsCompleted}/{aar.questsPlanned}</p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">QUESTS</p>
          </div>
          <div className="bg-card p-3 text-center">
            <p className="font-mono text-lg font-bold text-foreground">{aar.peakWindowUtilization}%</p>
            <p className="font-mono text-[9px] text-muted-foreground tracking-wider">PEAK</p>
          </div>
        </div>

        {/* Insights */}
        <div className="p-4 space-y-3">
          {/* Win */}
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono text-[9px] tracking-wider text-emerald-400 uppercase">Win of the Day</span>
            </div>
            <p className="font-mono text-xs text-foreground">{aar.winOfTheDay}</p>
          </div>

          {/* Miss */}
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <X className="w-3.5 h-3.5 text-destructive" />
              <span className="font-mono text-[9px] tracking-wider text-destructive uppercase">Miss of the Day</span>
            </div>
            <p className="font-mono text-xs text-foreground">{aar.missOfTheDay}</p>
          </div>

          {/* Pattern */}
          {aar.patternObserved && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-mono text-[9px] tracking-wider text-yellow-400 uppercase">Pattern Observed</span>
              </div>
              <p className="font-mono text-xs text-foreground">{aar.patternObserved}</p>
            </div>
          )}

          {/* Tomorrow */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-[9px] tracking-wider text-primary uppercase">Tomorrow's Priority</span>
            </div>
            <p className="font-mono text-xs text-foreground">{aar.tomorrowPriority}</p>
          </div>
        </div>

        {/* Dismiss */}
        <div className="p-4 pt-0">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 rounded-md border border-primary/30 bg-primary/10 font-mono text-[10px] tracking-[0.3em] text-primary uppercase hover:bg-primary/20 transition-colors"
          >
            Acknowledged
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
