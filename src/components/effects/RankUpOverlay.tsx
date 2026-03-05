import { useEffect, useState } from 'react';
import { hapticSuccess } from '@/utils/haptics';

interface RankUpOverlayProps {
  show: boolean;
  newRank: string;
  onDone: () => void;
}

export const RankUpOverlay = ({ show, newRank, onDone }: RankUpOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'flash' | 'rank' | 'fade'>('hidden');

  useEffect(() => {
    if (show) {
      hapticSuccess();
      setPhase('flash');
      const t1 = setTimeout(() => setPhase('rank'), 400);
      const t2 = setTimeout(() => setPhase('fade'), 2800);
      const t3 = setTimeout(() => { setPhase('hidden'); onDone(); }, 3400);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [show, onDone]);

  if (phase === 'hidden') return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      {/* Background pulse */}
      <div
        className="absolute inset-0"
        style={{
          background: phase === 'flash'
            ? 'radial-gradient(circle, hsl(263 91% 50% / 0.5) 0%, hsl(187 100% 50% / 0.2) 50%, transparent 100%)'
            : 'radial-gradient(circle, hsl(263 91% 50% / 0.15) 0%, transparent 70%)',
          animation: phase === 'flash' ? 'rankFlash 0.4s ease-out forwards' : undefined,
          transition: 'opacity 0.6s',
          opacity: phase === 'fade' ? 0 : 1,
        }}
      />

      {/* Rank text */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ${
          phase === 'rank' ? 'opacity-100 scale-100' :
          phase === 'fade' ? 'opacity-0 scale-110' :
          'opacity-0 scale-50'
        }`}
      >
        <p
          className="font-display text-sm uppercase tracking-[0.4em] text-primary mb-3"
          style={{ textShadow: '0 0 20px hsl(187 100% 50% / 0.8)' }}
        >
          Rank Advancement
        </p>
        <p
          className="font-display text-4xl font-bold text-secondary"
          style={{
            textShadow: '0 0 40px hsl(263 91% 50% / 0.8), 0 0 80px hsl(263 91% 50% / 0.4), 0 0 120px hsl(187 100% 50% / 0.3)',
          }}
        >
          {newRank}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          The System acknowledges your advancement.
        </p>
      </div>

      <style>{`
        @keyframes rankFlash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
