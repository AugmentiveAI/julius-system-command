// TODO: Phase2-IP-rebrand — "Shadow Monarch" title needs original name
import { useEffect, useState } from 'react';

interface ShadowMonarchBarProps {
  progress: number; // 0-100
  title: string;
}

const MILESTONES = [
  { pct: 10, label: 'D' },
  { pct: 25, label: 'C' },
  { pct: 45, label: 'B' },
  { pct: 60, label: 'A' },
  { pct: 75, label: 'S' },
  { pct: 90, label: 'MC' },
];

export function ShadowMonarchBar({ progress, title }: ShadowMonarchBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timeout);
  }, [progress]);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
          SHADOW MONARCH PROGRESS
        </span>
        <span className="font-mono text-[10px] font-bold text-primary">
          {progress}% — {title}
        </span>
      </div>

      <div className="relative h-2 w-full rounded-full bg-secondary/30 overflow-hidden">
        {/* Milestone markers */}
        {MILESTONES.map(m => (
          <div
            key={m.label}
            className="absolute top-0 h-full w-px bg-muted-foreground/30"
            style={{ left: `${m.pct}%` }}
          />
        ))}

        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${animatedProgress}%`,
            background: 'linear-gradient(90deg, hsl(263 91% 40%), hsl(187 100% 50%))',
            boxShadow: '0 0 8px hsl(187 100% 50% / 0.6), 0 0 16px hsl(187 100% 50% / 0.3)',
          }}
        />

        {/* Current position glow */}
        {animatedProgress > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full transition-all duration-1000 ease-out"
            style={{
              left: `calc(${animatedProgress}% - 6px)`,
              background: 'hsl(0 0% 100%)',
              boxShadow: '0 0 6px hsl(187 100% 50%), 0 0 12px hsl(187 100% 50% / 0.5)',
            }}
          />
        )}
      </div>

      {/* Milestone labels */}
      <div className="relative h-3">
        {MILESTONES.map(m => (
          <span
            key={m.label}
            className={`absolute font-mono text-[8px] -translate-x-1/2 ${
              animatedProgress >= m.pct ? 'text-primary' : 'text-muted-foreground/50'
            }`}
            style={{ left: `${m.pct}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
