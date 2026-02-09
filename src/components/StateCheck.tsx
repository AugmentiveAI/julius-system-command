import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  PlayerStateCheck,
  EnergyLevel,
  FocusLevel,
  MoodLevel,
  StressLevel,
  DAY_TYPES,
  STATE_THRESHOLDS,
} from '@/types/playerState';
import { useToast } from '@/hooks/use-toast';

const STATE_HISTORY_KEY = 'systemStateHistory';

const ROWS = [
  { key: 'energy' as const, emoji: '⚡', label: 'Energy' },
  { key: 'focus' as const, emoji: '🎯', label: 'Focus' },
  { key: 'mood' as const, emoji: '🌡️', label: 'Mood' },
  { key: 'stress' as const, emoji: '💀', label: 'Stress' },
];

function getCurrentTimeBlock(): 'morning' | 'midday' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

function getRecommendation(composite: number): 'push' | 'steady' | 'recover' {
  if (composite >= STATE_THRESHOLDS.push.minComposite) return 'push';
  if (composite >= STATE_THRESHOLDS.steady.minComposite) return 'steady';
  return 'recover';
}

interface StateCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StateCheck({ open, onOpenChange }: StateCheckProps) {
  const [energy, setEnergy] = useState(3);
  const [focus, setFocus] = useState(3);
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const { toast } = useToast();

  const values: Record<string, number> = { energy, focus, mood, stress };
  const setters: Record<string, (v: number) => void> = {
    energy: setEnergy, focus: setFocus, mood: setMood, stress: setStress,
  };

  const composite = Number(((energy + focus + mood + (6 - stress)) / 4).toFixed(1));
  const recommendation = getRecommendation(composite);

  useEffect(() => {
    if (open) {
      setEnergy(3); setFocus(3); setMood(3); setStress(3);
    }
  }, [open]);

  const handleStart = useCallback(() => {
    const check: PlayerStateCheck = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      energy: energy as EnergyLevel,
      focus: focus as FocusLevel,
      mood: mood as MoodLevel,
      stress: stress as StressLevel,
      compositeScore: composite,
      dayType: DAY_TYPES[new Date().getDay()],
      timeBlock: getCurrentTimeBlock(),
      systemRecommendation: recommendation,
    };

    try {
      const stored = localStorage.getItem(STATE_HISTORY_KEY);
      const history: PlayerStateCheck[] = stored ? JSON.parse(stored) : [];
      history.push(check);
      localStorage.setItem(STATE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save state check:', e);
    }

    // Close immediately
    onOpenChange(false);

    // Brief toast
    toast({
      title: 'Quests calibrated.',
      duration: 1500,
    });
  }, [energy, focus, mood, stress, composite, recommendation, onOpenChange, toast]);

  const modeConfig = {
    push: { label: 'PUSH', dot: 'bg-green-400', text: 'text-green-400' },
    steady: { label: 'STEADY', dot: 'bg-amber-400', text: 'text-amber-400' },
    recover: { label: 'RECOVERY', dot: 'bg-red-400', text: 'text-red-400' },
  };
  const mode = modeConfig[recommendation];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border border-border shadow-lg max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-base font-medium text-foreground">
            How are you right now?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* 4 rows of tappable circles */}
          {ROWS.map(({ key, emoji, label }) => {
            const val = values[key];
            const set = setters[key];
            return (
              <div key={key} className="space-y-1.5">
                <span className="text-xs font-mono text-muted-foreground">
                  {emoji} {label}
                </span>
                <div className="flex items-center gap-2.5">
                  {[1, 2, 3, 4, 5].map(n => {
                    const selected = n <= val;
                    return (
                      <button
                        key={n}
                        onClick={() => set(n)}
                        className={`flex items-center justify-center rounded-full font-mono text-sm font-bold transition-all
                          ${selected
                            ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                            : 'bg-muted/30 text-muted-foreground/40 border-border hover:border-muted-foreground/40'
                          } border`}
                        style={{ width: 44, height: 44, minWidth: 44 }}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Real-time mode indicator */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className={`h-3 w-3 rounded-full ${mode.dot}`} />
            <span className={`font-mono text-sm font-bold tracking-wider ${mode.text}`}>
              {mode.label}
            </span>
          </div>

          {/* Start button */}
          <Button
            onClick={handleStart}
            className="w-full font-mono tracking-wider text-sm"
          >
            START
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
