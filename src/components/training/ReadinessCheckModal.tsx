import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Battery, Moon, Zap, AlertTriangle } from 'lucide-react';

interface ReadinessCheckModalProps {
  open: boolean;
  onComplete: (score: number) => void;
}

const READINESS_LABELS: Record<number, { label: string; color: string; icon: React.ElementType }> = {
  1: { label: 'Wrecked', color: 'text-red-500', icon: AlertTriangle },
  2: { label: 'Very Low', color: 'text-red-400', icon: AlertTriangle },
  3: { label: 'Low', color: 'text-orange-400', icon: Battery },
  4: { label: 'Below Average', color: 'text-orange-400', icon: Battery },
  5: { label: 'Average', color: 'text-amber-400', icon: Battery },
  6: { label: 'Decent', color: 'text-amber-300', icon: Zap },
  7: { label: 'Good', color: 'text-green-400', icon: Zap },
  8: { label: 'Strong', color: 'text-green-400', icon: Zap },
  9: { label: 'Excellent', color: 'text-emerald-400', icon: Zap },
  10: { label: 'Peak', color: 'text-emerald-300', icon: Moon },
};

export function ReadinessCheckModal({ open, onComplete }: ReadinessCheckModalProps) {
  const [score, setScore] = useState(5);
  const config = READINESS_LABELS[score];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="border-border bg-card sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground text-center">
            Pre-Workout Assessment
          </DialogTitle>
          <DialogDescription className="font-tech text-xs text-muted-foreground text-center">
            How ready do you feel to train right now?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score Display */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Icon className={`h-6 w-6 ${config.color}`} />
              <span className={`font-mono text-4xl font-bold ${config.color}`}>{score}</span>
            </div>
            <p className={`font-tech text-sm ${config.color}`}>{config.label}</p>
          </div>

          {/* Slider */}
          <div className="px-2">
            <Slider
              value={[score]}
              onValueChange={([v]) => setScore(v)}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[9px] text-muted-foreground">1</span>
              <span className="font-mono text-[9px] text-muted-foreground">10</span>
            </div>
          </div>

          {/* Guidance */}
          <div className="rounded-lg border border-border bg-background/50 p-3 space-y-1">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">System Note</p>
            <p className="font-tech text-xs text-foreground/70">
              {score <= 3
                ? 'Low readiness detected. The System will auto-reduce volume to prevent injury.'
                : score <= 6
                ? 'Moderate readiness. Standard prescription applies.'
                : 'High readiness. Full volume authorized. Push today.'}
            </p>
          </div>

          <Button
            onClick={() => onComplete(score)}
            className="w-full"
          >
            Begin Training
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
