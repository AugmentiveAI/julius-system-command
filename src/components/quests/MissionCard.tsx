import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface MissionCardProps {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  onToggle: (id: string) => void;
  badge?: { label: string; color: string } | null;
  borderGlow?: string | null; // for emergency quests
  persuasionMessage?: string | null;
  statColor?: string;
  description?: string;
  timeBlock?: string;
}

export function MissionCard({
  id, title, xp, completed, onToggle,
  badge, borderGlow, persuasionMessage, statColor,
  description, timeBlock,
}: MissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevCompleted = useRef(completed);

  // Micro-feedback: flash + floating XP on completion
  useEffect(() => {
    if (completed && !prevCompleted.current) {
      setFlash(true);
      setShowXP(true);
      setTimeout(() => setFlash(false), 200);
      setTimeout(() => setShowXP(false), 1200);
    }
    prevCompleted.current = completed;
  }, [completed]);

  return (
    <div
      className={`relative rounded-lg border p-3 transition-all ${
        completed
          ? 'border-green-500/30 bg-green-500/5'
          : borderGlow
            ? `bg-card/50 ${borderGlow}`
            : 'border-border bg-card/50 hover:border-primary/20'
      } ${flash ? 'ring-1 ring-primary/50' : ''}`}
      style={flash && statColor ? { boxShadow: `0 0 12px ${statColor}` } : undefined}
    >
      {/* Floating XP animation */}
      {showXP && (
        <span className="absolute top-0 right-3 font-mono text-xs font-bold text-primary animate-bounce pointer-events-none" style={{ animation: 'floatUp 1s ease-out forwards' }}>
          +{xp} XP
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Completion checkbox */}
        <button
          onClick={() => onToggle(id)}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
            completed ? 'border-green-500 bg-green-500' : 'border-muted-foreground hover:border-primary'
          }`}
        >
          {completed && <Check className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-tech text-sm font-semibold ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {badge && (
                <span className={`font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded border ${badge.color}`}>
                  {badge.label}
                </span>
              )}
              <span className="font-mono text-[10px] text-primary font-semibold">+{xp}</span>
            </div>
          </div>

          {persuasionMessage && !completed && (
            <p className="mt-0.5 font-mono text-[10px] italic text-muted-foreground/70 truncate">
              {persuasionMessage}
            </p>
          )}

          {/* Expandable description */}
          {(description || timeBlock) && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="mt-1 flex items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              <span className="font-mono text-[9px]">details</span>
            </button>
          )}
          {expanded && (
            <div className="mt-1.5 space-y-1">
              {description && (
                <p className="font-mono text-[10px] text-muted-foreground/70">{description}</p>
              )}
              {timeBlock && (
                <p className="font-mono text-[9px] text-muted-foreground/50 uppercase">{timeBlock}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
