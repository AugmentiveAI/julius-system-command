import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { MissionCard } from '@/components/quests/MissionCard';

interface Mission {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  type: string;
  badge?: { label: string; color: string } | null;
  borderGlow?: string | null;
  persuasionMessage?: string | null;
  description?: string;
  timeBlock?: string;
}

interface MissionBatchProps {
  missions: Mission[];
  onToggle: (id: string) => void;
  completedCount: number;
  totalCount: number;
}

export function MissionBatch({ missions, onToggle, completedCount, totalCount }: MissionBatchProps) {
  const [expanded, setExpanded] = useState(false);
  const allDone = completedCount >= totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="rounded-lg border border-border/50 bg-card/30 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-card/50 transition-colors"
      >
        {/* Progress ring */}
        <div className="relative h-8 w-8 shrink-0">
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" opacity={0.2} />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={allDone ? 'hsl(var(--chart-2))' : 'hsl(var(--primary))'}
              strokeWidth="2"
              strokeDasharray={`${progressPct * 0.94} 100`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          {allDone && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-green-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
            {allDone ? 'ALL MISSIONS COMPLETE' : 'TODAY\'S MISSIONS'}
          </p>
          <p className="font-mono text-xs text-foreground/80">
            {completedCount} / {totalCount} completed
          </p>
        </div>

        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable mission list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              id={mission.id}
              title={mission.title}
              xp={mission.xp}
              completed={mission.completed}
              onToggle={onToggle}
              badge={mission.badge}
              borderGlow={mission.borderGlow}
              persuasionMessage={mission.persuasionMessage}
              description={mission.description}
              timeBlock={mission.timeBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
}
