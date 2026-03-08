import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RPESlider } from './RPESlider';
import { Dumbbell, Trophy, Flame } from 'lucide-react';

interface SessionSummaryModalProps {
  open: boolean;
  onComplete: (fatigueScore: number, notes: string) => void;
  totalVolume: number;
  exercisesCompleted: number;
  exercisesTotal: number;
  prsHit: string[];
  xpEarned: number;
}

export function SessionSummaryModal({
  open,
  onComplete,
  totalVolume,
  exercisesCompleted,
  exercisesTotal,
  prsHit,
  xpEarned,
}: SessionSummaryModalProps) {
  const [fatigueScore, setFatigueScore] = useState(5);
  const [notes, setNotes] = useState('');

  const completionRate = Math.round((exercisesCompleted / Math.max(exercisesTotal, 1)) * 100);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="border-border bg-card sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center">
            Session Complete
          </DialogTitle>
          <DialogDescription className="font-tech text-xs text-muted-foreground text-center">
            Log your post-workout data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
              <Dumbbell className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="font-mono text-lg font-bold text-foreground">
                {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase">Volume (lbs)</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
              <Flame className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <p className="font-mono text-lg font-bold text-foreground">{completionRate}%</p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase">Completed</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-2.5 text-center">
              <Trophy className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
              <p className="font-mono text-lg font-bold text-primary">+{xpEarned}</p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase">XP</p>
            </div>
          </div>

          {/* PRs */}
          {prsHit.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="font-display text-[10px] uppercase tracking-wider text-yellow-400 mb-1">
                🏆 New Personal Records
              </p>
              {prsHit.map((pr, i) => (
                <p key={i} className="font-tech text-xs text-foreground/80">{pr}</p>
              ))}
            </div>
          )}

          {/* Fatigue Score */}
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Post-Session Fatigue
            </p>
            <RPESlider value={fatigueScore} onChange={setFatigueScore} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </p>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How did it feel? Any tweaks needed?"
              className="h-16 resize-none font-tech text-sm bg-background/50"
            />
          </div>

          <Button
            onClick={() => onComplete(fatigueScore, notes)}
            className="w-full"
          >
            Log Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
