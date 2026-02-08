import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { PlayerStateCheck, DAY_TYPES, TIME_BLOCKS } from '@/types/playerState';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Intensity } from '@/utils/questCalibration';

interface CalibrationDetailsProps {
  currentState: PlayerStateCheck;
  intensity: Intensity;
  questCount: number;
  geneticAlert: string | null;
  recentCompletionRate: number; // 0-100
}

export const CalibrationDetails = ({
  currentState,
  intensity,
  questCount,
  geneticAlert,
  recentCompletionRate,
}: CalibrationDetailsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const dayLabel = currentState.dayType === 'work' ? 'Work Day' : 'Free Day';
  const blockLabel = TIME_BLOCKS[currentState.timeBlock].label;
  const modeLabel = currentState.systemRecommendation === 'push' ? 'PUSH'
    : currentState.systemRecommendation === 'steady' ? 'STEADY' : 'RECOVERY';

  const modifiers: string[] = [];
  if (geneticAlert) modifiers.push('COMT/ACTN3 active');
  if (currentState.dayType === 'free') modifiers.push('Free Day boost');

  const reasoning = `Assigned ${questCount} quests based on ${modeLabel} mode + ${dayLabel} + ${blockLabel}${modifiers.length ? ' + ' + modifiers.join(' + ') : ''}.`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border bg-card/50">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground tracking-wider">
                Why these quests?
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Composite Score</div>
              <div className="text-foreground">{currentState.compositeScore.toFixed(1)}</div>

              <div className="text-muted-foreground">Day Type</div>
              <div className="text-foreground">{dayLabel}</div>

              <div className="text-muted-foreground">Time Block</div>
              <div className="text-foreground">{blockLabel}</div>

              <div className="text-muted-foreground">Genetic Modifiers</div>
              <div className="text-foreground">{geneticAlert || 'None active'}</div>

              <div className="text-muted-foreground">7-Day Completion</div>
              <div className="text-foreground">{recentCompletionRate}%</div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="text-muted-foreground italic">{reasoning}</p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
