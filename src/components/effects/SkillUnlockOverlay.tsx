import { useEffect, useState } from 'react';
import { Skill } from '@/types/skills';
import { hapticSuccess } from '@/utils/haptics';

interface SkillUnlockOverlayProps {
  skill: Skill | null;
  onDone: () => void;
}

export const SkillUnlockOverlay = ({ skill, onDone }: SkillUnlockOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'reveal' | 'fade'>('hidden');

  useEffect(() => {
    if (skill) {
      hapticSuccess();
      setPhase('reveal');
      const t1 = setTimeout(() => setPhase('fade'), 2500);
      const t2 = setTimeout(() => { setPhase('hidden'); onDone(); }, 3100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [skill, onDone]);

  if (phase === 'hidden' || !skill) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80"
        style={{ transition: 'opacity 0.6s', opacity: phase === 'fade' ? 0 : 1 }}
      />
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          phase === 'reveal' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <p className="font-display text-[10px] tracking-[0.4em] uppercase text-primary/70 mb-2">
          Skill Acquired
        </p>
        <p className="text-5xl mb-3">{skill.icon}</p>
        <p
          className="font-display text-2xl font-bold text-foreground"
          style={{ textShadow: '0 0 20px hsl(187 100% 50% / 0.5)' }}
        >
          {skill.name}
        </p>
        <p className="mt-2 font-mono text-xs text-primary/80 max-w-[250px] mx-auto">
          {skill.effect}
        </p>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground/50">
          {skill.description}
        </p>
      </div>
    </div>
  );
};
