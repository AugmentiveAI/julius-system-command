import { MASTERABLE_SKILLS, getMasteryLevel, getNextMasteryLevel, getMasteryProgress } from '@/types/skillMastery';
import { SkillMasteryState } from '@/types/skillMastery';

interface SkillMasteryPanelProps {
  skills: SkillMasteryState[];
}

const CATEGORY_COLORS: Record<string, string> = {
  combat: 'text-red-400',
  trade: 'text-amber-400',
  intel: 'text-blue-400',
  endurance: 'text-green-400',
};

export function SkillMasteryPanel({ skills }: SkillMasteryPanelProps) {
  const enriched = MASTERABLE_SKILLS.map(def => {
    const state = skills.find(s => s.skillId === def.id);
    const timesUsed = state?.timesUsed || 0;
    const current = getMasteryLevel(timesUsed);
    const next = getNextMasteryLevel(timesUsed);
    const progress = getMasteryProgress(timesUsed);
    return { def, state, current, next, progress, timesUsed };
  }).sort((a, b) => b.timesUsed - a.timesUsed);

  return (
    <div className="space-y-2">
      {enriched.map(({ def, current, next, progress, timesUsed }) => (
        <div key={def.id} className="rounded-lg border border-border bg-card/30 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{def.icon}</span>
              <div>
                <span className="font-mono text-[11px] font-bold text-foreground">{def.name}</span>
                <span className={`ml-2 font-mono text-[9px] ${CATEGORY_COLORS[def.category] || 'text-muted-foreground'}`}>
                  Lv.{current.level} {current.name}
                </span>
              </div>
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">
              {timesUsed} uses
            </span>
          </div>

          <p className="font-mono text-[8px] text-muted-foreground leading-relaxed">{def.description}</p>

          {/* Progress bar */}
          <div className="space-y-0.5">
            <div className="h-1 rounded-full bg-muted/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[8px] text-muted-foreground">
                {current.xpMultiplier}x XP
              </span>
              {next ? (
                <span className="font-mono text-[8px] text-muted-foreground">
                  {next.requiredUses - timesUsed} more → Lv.{next.level} ({next.xpMultiplier}x)
                </span>
              ) : (
                <span className="font-mono text-[8px] text-green-400">MAX MASTERY</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
