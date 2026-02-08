import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGeneticState } from '@/hooks/useGeneticState';
import { COMTPhase, ACTN3Status } from '@/utils/geneticEngine';
import { Progress } from '@/components/ui/progress';

const COMT_CONFIG: Record<COMTPhase, { color: string; dotClass: string; label: string }> = {
  peak: {
    color: 'text-green-400',
    dotClass: 'bg-green-400 animate-pulse shadow-[0_0_8px_hsl(142_76%_36%/0.6)]',
    label: 'WARRIOR PEAK',
  },
  stable: {
    color: 'text-primary',
    dotClass: 'bg-primary',
    label: 'STABLE',
  },
  dip: {
    color: 'text-amber-400',
    dotClass: 'bg-amber-400 animate-pulse shadow-[0_0_8px_hsl(38_92%_50%/0.6)]',
    label: 'DIP — reduced capacity',
  },
  recovery: {
    color: 'text-secondary',
    dotClass: 'bg-secondary',
    label: 'RECOVERING',
  },
};

function getSprintColor(sprints: number): string {
  if (sprints <= 2) return 'text-green-400';
  if (sprints === 3) return 'text-amber-400';
  return 'text-red-400';
}

function getSprintProgressColor(sprints: number): string {
  if (sprints <= 2) return '[&>div]:bg-green-400';
  if (sprints === 3) return '[&>div]:bg-amber-400';
  return '[&>div]:bg-red-400';
}

export const GeneticHUD = () => {
  const { geneticState, sprintsToday } = useGeneticState();
  const [expanded, setExpanded] = useState(false);

  const comtConfig = COMT_CONFIG[geneticState.comtPhase];
  const sprintColor = getSprintColor(sprintsToday);
  const sprintProgressColor = getSprintProgressColor(sprintsToday);

  const hasBuffs = geneticState.activeBuffs.length > 0;
  const hasDebuffs = geneticState.activeDebuffs.length > 0;
  const hasMitigations = geneticState.activeDebuffs.some(d => d.mitigation);

  return (
    <div className="mx-auto max-w-2xl px-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm transition-all hover:border-border"
      >
        {/* Main Status Bar */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left: COMT Phase */}
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${comtConfig.dotClass}`} />
            <span className={`font-mono text-[10px] font-bold tracking-[0.15em] ${comtConfig.color}`}>
              {comtConfig.label}
            </span>
          </div>

          {/* Right: Sprint Counter + Expand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[10px] font-bold ${sprintColor}`}>
                ⚡ SPRINTS: {Math.min(sprintsToday, 4)}/4
              </span>
              <Progress
                value={Math.min(sprintsToday, 4) * 25}
                className={`h-1.5 w-12 bg-muted ${sprintProgressColor}`}
              />
            </div>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Expanded: Buff/Debuff Pills */}
        {expanded && (hasBuffs || hasDebuffs || hasMitigations) && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/40 px-3 py-2">
            {geneticState.activeBuffs.map((buff, i) => (
              <span
                key={`buff-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-green-400 shadow-[0_0_6px_hsl(142_76%_36%/0.2)]"
              >
                {buff.icon} {buff.name} <span className="text-green-300/70">{buff.effect}</span>
              </span>
            ))}
            {geneticState.activeDebuffs.map((debuff, i) => (
              <span
                key={`debuff-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-red-400 animate-pulse"
              >
                {debuff.icon} {debuff.name} <span className="text-red-300/70">{debuff.effect}</span>
              </span>
            ))}
            {geneticState.activeDebuffs
              .filter(d => d.mitigation)
              .map((debuff, i) => (
                <span
                  key={`mit-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400"
                >
                  🟡 {debuff.mitigation}
                </span>
              ))}
          </div>
        )}
      </button>
    </div>
  );
};
