import { useEffect, useState } from 'react';

interface PillarArc {
  pillar: 'mind' | 'body' | 'skill';
  completed: boolean;
}

interface ProgressRingProps {
  progress: number; // 0-100
  title: string;
  currentXP: number;
  xpToNextLevel: number;
  level: number;
  pillarArcs?: PillarArc[];
}

const PILLAR_COLORS = {
  mind: { active: 'hsl(187 100% 50%)', inactive: 'hsl(187 100% 50% / 0.15)' },
  body: { active: 'hsl(142 70% 50%)', inactive: 'hsl(142 70% 50% / 0.15)' },
  skill: { active: 'hsl(45 100% 60%)', inactive: 'hsl(45 100% 60% / 0.15)' },
};

export const ProgressRing = ({ progress, title, currentXP, xpToNextLevel, level, pillarArcs }: ProgressRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timeout);
  }, [progress]);

  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Pillar arc geometry — 3 small arcs inside the main ring
  const pillarStroke = 3;
  const pillarRadius = radius - 12;
  const pillarCircumference = 2 * Math.PI * pillarRadius;
  const gapDeg = 8; // degrees gap between arcs
  const arcDeg = (360 - gapDeg * 3) / 3;
  const arcLength = (arcDeg / 360) * pillarCircumference;
  const gapLength = (gapDeg / 360) * pillarCircumference;

  const pillarOrder: Array<'mind' | 'body' | 'skill'> = ['mind', 'body', 'skill'];

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(240 15% 15%)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px hsl(187 100% 50% / 0.5))',
            }}
          />

          {/* Pillar arcs — 3 concentric arcs inside */}
          {pillarArcs && pillarArcs.length === 3 && pillarOrder.map((pillar, i) => {
            const arc = pillarArcs.find(a => a.pillar === pillar);
            if (!arc) return null;
            const color = PILLAR_COLORS[pillar];
            const offset = i * (arcLength + gapLength);

            return (
              <circle
                key={pillar}
                cx={size / 2}
                cy={size / 2}
                r={pillarRadius}
                fill="none"
                stroke={arc.completed ? color.active : color.inactive}
                strokeWidth={pillarStroke}
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${pillarCircumference - arcLength}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700 ease-out"
                style={arc.completed ? {
                  filter: `drop-shadow(0 0 4px ${color.active.replace(')', ' / 0.6)')})`,
                } : undefined}
              />
            );
          })}

          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(263 91% 50%)" />
              <stop offset="100%" stopColor="hsl(187 100% 50%)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-foreground text-glow-primary">
            {progress}%
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">LVL {level}</span>
        </div>
      </div>

      <span className="font-display text-sm font-bold tracking-wider text-secondary text-glow-secondary">
        {title}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {currentXP}/{xpToNextLevel} XP to next level
      </span>
    </div>
  );
};
