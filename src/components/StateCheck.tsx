import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Briefcase, Palmtree } from 'lucide-react';
import {
  PlayerStateCheck,
  EnergyLevel,
  FocusLevel,
  MoodLevel,
  StressLevel,
  DAY_TYPES,
  TIME_BLOCKS,
  STATE_THRESHOLDS,
} from '@/types/playerState';
import { useToast } from '@/hooks/use-toast';

const STATE_HISTORY_KEY = 'systemStateHistory';

const SLIDER_CONFIG = [
  { key: 'energy' as const, emoji: '⚡', label: 'Energy', low: 'Depleted', high: 'Supercharged' },
  { key: 'focus' as const, emoji: '🎯', label: 'Focus', low: 'Scattered', high: 'Locked In' },
  { key: 'mood' as const, emoji: '🌡️', label: 'Mood', low: 'Low', high: 'Excellent' },
  { key: 'stress' as const, emoji: '💀', label: 'Stress', low: 'Calm', high: 'Overwhelmed' },
];

function getCurrentTimeBlock(): 'morning' | 'midday' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

function getDayType(): 'work' | 'free' {
  return DAY_TYPES[new Date().getDay()];
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
  const [energy, setEnergy] = useState<number>(3);
  const [focus, setFocus] = useState<number>(3);
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  const composite = Number(((energy + focus + mood + (6 - stress)) / 4).toFixed(1));
  const recommendation = getRecommendation(composite);
  const timeBlock = getCurrentTimeBlock();
  const dayType = getDayType();
  const blockInfo = TIME_BLOCKS[timeBlock];

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEnergy(3);
      setFocus(3);
      setMood(3);
      setStress(3);
      setConfirmed(false);
    }
  }, [open]);

  const handleConfirm = useCallback(() => {
    const check: PlayerStateCheck = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      energy: energy as EnergyLevel,
      focus: focus as FocusLevel,
      mood: mood as MoodLevel,
      stress: stress as StressLevel,
      compositeScore: composite,
      dayType,
      timeBlock,
      systemRecommendation: recommendation,
    };

    // Save to localStorage
    try {
      const stored = localStorage.getItem(STATE_HISTORY_KEY);
      const history: PlayerStateCheck[] = stored ? JSON.parse(stored) : [];
      history.push(check);
      localStorage.setItem(STATE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save state check:', e);
    }

    setConfirmed(true);
    toast({
      title: 'State logged. Quests calibrating...',
    });

    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  }, [energy, focus, mood, stress, composite, dayType, timeBlock, recommendation, onOpenChange, toast]);

  const compositeColor =
    composite >= 3.5 ? 'text-green-400' :
    composite >= 2.5 ? 'text-yellow-400' :
    'text-red-400';

  const compositeGlow =
    composite >= 3.5 ? 'drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]' :
    composite >= 2.5 ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' :
    'drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(240,20%,6%)] border border-[hsl(187,100%,50%,0.3)] shadow-[0_0_40px_hsl(187,100%,50%,0.15)] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center font-mono text-lg tracking-[0.2em] text-primary" style={{ textShadow: '0 0 20px hsl(187 100% 50% / 0.7)' }}>
            ◈ SYSTEM SCAN INITIATED ◈
          </DialogTitle>
        </DialogHeader>

        {confirmed ? (
          <div className="flex items-center justify-center py-12 animate-fade-in">
            <p className="text-muted-foreground font-mono text-sm tracking-wider animate-pulse">
              State logged. Quests calibrating...
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Day Type & Time Block */}
            <div className="flex items-center justify-between px-2 py-2 rounded border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-mono">
                {dayType === 'work' ? (
                  <Briefcase className="w-4 h-4 text-primary" />
                ) : (
                  <Palmtree className="w-4 h-4 text-secondary" />
                )}
                <span className="text-foreground tracking-wider">
                  {dayType === 'work' ? 'WORK DAY' : 'FREE DAY'}
                </span>
              </div>
              <div className="text-xs font-mono text-muted-foreground tracking-wider">
                {blockInfo.label.toUpperCase()}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              {SLIDER_CONFIG.map(({ key, emoji, label, low, high }) => {
                const value = key === 'energy' ? energy : key === 'focus' ? focus : key === 'mood' ? mood : stress;
                const setter = key === 'energy' ? setEnergy : key === 'focus' ? setFocus : key === 'mood' ? setMood : setStress;

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-mono text-foreground tracking-wider">
                        {emoji} {label.toUpperCase()}
                      </label>
                      <span className="text-sm font-mono text-primary font-bold">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(v) => setter(v[0])}
                      min={1}
                      max={5}
                      step={1}
                      className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_hsl(187,100%,50%,0.5)] [&_[role=slider]]:w-5 [&_[role=slider]]:h-5"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{low}</span>
                      <span>{high}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composite Score */}
            <div className="border border-border/50 rounded p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground tracking-[0.15em]">COMPOSITE SCORE</span>
                <span className={`text-2xl font-mono font-bold ${compositeColor} ${compositeGlow}`}>
                  {composite.toFixed(1)}
                </span>
              </div>

              {/* Recommendation */}
              <div className={`text-xs font-mono leading-relaxed ${
                recommendation === 'push' ? 'text-green-400' :
                recommendation === 'steady' ? 'text-yellow-400' :
                'text-red-400 animate-pulse'
              }`} style={recommendation === 'push' ? { textShadow: '0 0 10px rgba(74,222,128,0.4)' } : undefined}>
                <span className="font-bold tracking-[0.15em]">
                  {recommendation === 'push' ? '▲ PUSH MODE' :
                   recommendation === 'steady' ? '■ STEADY MODE' :
                   '▼ RECOVERY MODE'}
                </span>
                <span className="text-muted-foreground"> — </span>
                {STATE_THRESHOLDS[recommendation].description}
              </div>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              className="w-full font-mono tracking-[0.2em] text-sm bg-primary/10 border border-primary/50 text-primary hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(187,100%,50%,0.3)] transition-all"
            >
              CONFIRM STATE
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
