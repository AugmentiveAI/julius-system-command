import { useState, useEffect, useCallback } from 'react';

interface SystemBriefingProps {
  onComplete: () => void;
}

const BRIEFING_ITEMS = [
  {
    icon: '⚔️',
    label: 'DAILY PILLARS',
    detail: 'Three quests. Mind, Body, Skill. Every day.',
  },
  {
    icon: '📊',
    label: 'QUESTS & XP',
    detail: 'Complete tasks. Earn XP. Level up.',
  },
  {
    icon: '👑',
    label: 'SHADOW MONARCH',
    detail: 'Your progress ring. Fill it. Become unstoppable.',
  },
];

export function SystemBriefing({ onComplete }: SystemBriefingProps) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState(0);
  const [buttonReady, setButtonReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Animate panel in
  useEffect(() => {
    const t = setTimeout(() => setPanelVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Stagger items after panel appears
  useEffect(() => {
    if (!panelVisible) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    BRIEFING_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleItems(i + 1), 400 + i * 500));
    });
    timers.push(setTimeout(() => setButtonReady(true), 400 + BRIEFING_ITEMS.length * 500 + 300));
    return () => timers.forEach(clearTimeout);
  }, [panelVisible]);

  const handleProceed = useCallback(() => {
    setFadeOut(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background/95 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(187 100% 50% / 0.04) 0%, transparent 70%)',
        }}
      />

      {/* The System Panel — Solo Leveling notification style */}
      <div
        className="relative mx-4 max-w-sm w-full transition-all duration-700"
        style={{
          opacity: panelVisible ? 1 : 0,
          transform: panelVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        }}
      >
        {/* Outer glow border */}
        <div
          className="absolute -inset-[1px] rounded-lg opacity-60"
          style={{
            background: 'linear-gradient(135deg, hsl(187 100% 50% / 0.5), hsl(263 91% 66% / 0.3), hsl(187 100% 50% / 0.5))',
            filter: 'blur(1px)',
          }}
        />

        {/* Panel body */}
        <div
          className="relative rounded-lg border border-primary/30 p-6"
          style={{
            background: 'linear-gradient(180deg, hsl(240 20% 8% / 0.98) 0%, hsl(240 20% 6% / 0.99) 100%)',
            boxShadow: '0 0 40px hsl(187 100% 50% / 0.15), inset 0 1px 0 hsl(187 100% 50% / 0.1)',
          }}
        >
          {/* Header decoration line */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <span className="font-display text-[10px] tracking-[0.4em] text-primary text-glow-primary">
              SYSTEM BRIEFING
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>

          {/* Subtitle */}
          <p className="mb-6 text-center font-mono text-[11px] text-muted-foreground/70">
            You have been granted access to the System.
          </p>

          {/* Briefing items */}
          <div className="space-y-4">
            {BRIEFING_ITEMS.map((item, i) => (
              <div
                key={item.label}
                className="flex items-start gap-3 transition-all duration-500"
                style={{
                  opacity: i < visibleItems ? 1 : 0,
                  transform: i < visibleItems ? 'translateX(0)' : 'translateX(-10px)',
                }}
              >
                <span className="mt-0.5 text-lg leading-none">{item.icon}</span>
                <div>
                  <p className="font-display text-[10px] tracking-[0.2em] text-primary/90">{item.label}</p>
                  <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-5 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Footer message */}
          <p className="mb-5 text-center font-mono text-[10px] text-muted-foreground/50 italic">
            The rest, you will discover as you rise.
          </p>

          {/* Proceed button */}
          <button
            onClick={handleProceed}
            onTouchEnd={(e) => { e.preventDefault(); handleProceed(); }}
            className="w-full rounded-md border border-primary/40 bg-primary/10 py-3 font-display text-[11px] tracking-[0.3em] text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_20px_hsl(187_100%_50%/0.3)] min-h-[48px]"
            style={{
              opacity: buttonReady ? 1 : 0,
              transform: buttonReady ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out, background-color 0.2s, box-shadow 0.2s',
              pointerEvents: buttonReady ? 'auto' : 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            PROCEED
          </button>
        </div>
      </div>
    </div>
  );
}
