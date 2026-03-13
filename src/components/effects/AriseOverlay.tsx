// TODO: Phase2-IP-rebrand — "Arise" mechanic needs original name for extraction system

interface AriseOverlayProps {
  show: boolean;
  shadowName: string;
  onDone?: () => void;
}

export const AriseOverlay = ({ show, shadowName, onDone }: AriseOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'dark' | 'arise' | 'name' | 'fade'>('hidden');

  useEffect(() => {
    if (!show) { setPhase('hidden'); return; }

    setPhase('dark');
    const t1 = setTimeout(() => setPhase('arise'), 400);
    const t2 = setTimeout(() => setPhase('name'), 1200);
    const t3 = setTimeout(() => setPhase('fade'), 2600);
    const t4 = setTimeout(() => { setPhase('hidden'); onDone?.(); }, 3200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [show, onDone]);

  if (phase === 'hidden') return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{
        animation: phase === 'fade' ? 'arise-fade-out 0.6s ease-out forwards' : undefined,
      }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-black/90"
        style={{
          animation: 'arise-bg-in 0.4s ease-out forwards',
        }}
      />

      {/* Screen pulse */}
      {(phase === 'arise' || phase === 'name') && (
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, hsl(263 91% 50% / 0.15) 0%, transparent 70%)',
            animation: 'arise-pulse 0.8s ease-out',
          }}
        />
      )}

      {/* ARISE text */}
      <div className="relative z-10 text-center">
        <h1
          className={`font-display text-7xl font-black tracking-[0.3em] transition-all duration-700 ${
            phase === 'arise' || phase === 'name' || phase === 'fade'
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-50 translate-y-8'
          }`}
          style={{
            color: 'hsl(263 91% 65%)',
            textShadow: `
              0 0 20px hsl(263 91% 50% / 0.8),
              0 0 60px hsl(263 91% 50% / 0.5),
              0 0 120px hsl(263 91% 50% / 0.3),
              0 4px 30px hsl(0 0% 0% / 0.5)
            `,
          }}
        >
          ARISE
        </h1>

        {/* Shadow name */}
        <p
          className={`mt-6 font-mono text-lg tracking-widest transition-all duration-500 ${
            phase === 'name' || phase === 'fade'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{
            color: 'hsl(187 100% 50%)',
            textShadow: '0 0 12px hsl(187 100% 50% / 0.6)',
          }}
        >
          {shadowName}
        </p>
        <p
          className={`mt-2 font-mono text-[10px] tracking-[0.2em] uppercase transition-all duration-500 delay-200 ${
            phase === 'name' || phase === 'fade'
              ? 'opacity-60 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
          style={{ color: 'hsl(187 100% 50% / 0.6)' }}
        >
          has joined your shadow army
        </p>
      </div>

      <style>{`
        @keyframes arise-bg-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes arise-pulse {
          0% { opacity: 0; transform: scale(0.8); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes arise-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
