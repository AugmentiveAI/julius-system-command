import { useState, useEffect, useCallback } from 'react';

const SYSTEM_ACTIVATED_KEY = 'systemActivated';
const SYSTEM_START_DATE_KEY = 'systemStartDate';

// Keys that indicate existing user data
const DATA_KEYS = [
  'the-system-player',
  'the-system-quests',
  'the-system-protocol-quests',
  'the-system-main-quests',
  'systemStateHistory',
  SYSTEM_ACTIVATED_KEY,
];

function isFirstRun(): boolean {
  return !DATA_KEYS.some(key => localStorage.getItem(key) !== null);
}

function markActivated(): void {
  localStorage.setItem(SYSTEM_ACTIVATED_KEY, 'true');
  localStorage.setItem(SYSTEM_START_DATE_KEY, new Date().toISOString().split('T')[0]);
}

// ── Step definitions ─────────────────────────────────────────────────

interface SequenceStep {
  lines: string[];
  duration: number; // ms before advancing
  lineDelay?: number; // ms between each line appearing
}

const STEPS: SequenceStep[] = [
  {
    lines: ['[SYSTEM INITIALIZING...]'],
    duration: 2000,
  },
  {
    lines: ['Player detected.', 'Designation: Julius', 'Rank: E-Rank Hunter'],
    duration: 3000,
    lineDelay: 600,
  },
  {
    lines: [
      'Scanning genetic profile...',
      'COMT Val/Val — WARRIOR classification confirmed',
      'ACTN3 CC — SPRINTER classification confirmed',
      'Archetype: Warrior-Sprinter',
    ],
    duration: 3000,
    lineDelay: 500,
  },
  {
    lines: [
      'Analyzing objectives...',
      'Primary Target: Shadow Monarch',
      'Interim Target: $10K MRR — Augmentive',
      'Backup Target: Marketing Operations Manager',
      'Timeline: 90 days',
    ],
    duration: 3000,
    lineDelay: 400,
  },
  {
    lines: [
      'Calibrating quest engine...',
      'Resistance tracking: ONLINE',
      'Genetic optimization: ONLINE',
      'Adaptive intelligence: ONLINE',
    ],
    duration: 3000,
    lineDelay: 500,
  },
  {
    lines: ['The System has chosen you.', 'Will you rise?'],
    duration: 2000,
    lineDelay: 800,
  },
];

// ── Component ────────────────────────────────────────────────────────

interface AwakeningSequenceProps {
  onComplete: () => void;
  isReplay?: boolean;
}

export function AwakeningSequence({ onComplete, isReplay = false }: AwakeningSequenceProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = initial black
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showButtons, setShowButtons] = useState(false);
  const [refuseMessage, setRefuseMessage] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Start sequence after mount
  useEffect(() => {
    const timer = setTimeout(() => setCurrentStep(0), 500);
    return () => clearTimeout(timer);
  }, []);

  // Advance lines within a step, then move to next step
  useEffect(() => {
    if (currentStep < 0 || currentStep >= STEPS.length) return;

    const step = STEPS[currentStep];
    const lineDelay = step.lineDelay ?? 500;

    // Reveal lines one by one
    setVisibleLines(0);
    const lineTimers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < step.lines.length; i++) {
      lineTimers.push(
        setTimeout(() => setVisibleLines(i + 1), lineDelay * (i + 1))
      );
    }

    // Advance to next step (or show buttons on last)
    const totalLineTime = lineDelay * step.lines.length;
    const advanceTimer = setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setShowButtons(true);
      }
    }, totalLineTime + step.duration);

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(advanceTimer);
    };
  }, [currentStep]);

  const handleAccept = useCallback(() => {
    if (!isReplay) {
      markActivated();
    }
    setFadeOut(true);
    setTimeout(onComplete, 800);
  }, [onComplete, isReplay]);

  const handleRefuse = useCallback(() => {
    setRefuseMessage(true);
    setTimeout(() => {
      handleAccept();
    }, 2000);
  }, [handleAccept]);

  const step = currentStep >= 0 && currentStep < STEPS.length ? STEPS[currentStep] : null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-700 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(187 100% 50% / 0.03) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-20 mx-auto max-w-lg px-6 text-center">
        {/* Current step lines */}
        {step && (
          <div className="space-y-3">
            {step.lines.map((line, i) => {
              const isVisible = i < visibleLines;
              const isHeader = i === 0 && (line.startsWith('[') || line.endsWith('...'));
              const isHighlight =
                line.includes('WARRIOR') ||
                line.includes('SPRINTER') ||
                line.includes('ONLINE') ||
                line.includes('Shadow Monarch');

              return (
                <p
                  key={`${currentStep}-${i}`}
                  className={`font-mono text-sm leading-relaxed transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                  } ${
                    isHeader
                      ? 'text-primary text-glow-primary text-base tracking-[0.2em]'
                      : isHighlight
                      ? 'text-primary/90'
                      : 'text-muted-foreground'
                  }`}
                >
                  {line}
                </p>
              );
            })}
          </div>
        )}

        {/* Final CTA: "Will you rise?" step with buttons */}
        {showButtons && (
          <div className="mt-10 space-y-4">
            {refuseMessage ? (
              <p className="font-mono text-sm text-destructive animate-fade-in">
                There is no refusing the System.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleAccept}
                  className="group relative cursor-pointer rounded-lg border border-primary/60 bg-primary/10 px-10 py-3 font-display text-sm uppercase tracking-[0.3em] text-primary transition-all duration-500 hover:bg-primary/20 hover:shadow-[0_0_30px_hsl(187_100%_50%/0.4)] min-h-[48px]"
                  style={{
                    boxShadow: '0 0 20px hsl(187 100% 50% / 0.2), inset 0 0 20px hsl(187 100% 50% / 0.05)',
                    opacity: 0,
                    animation: 'awaken-btn-in 0.8s ease-out 0.6s forwards',
                  }}
                >
                  I ACCEPT
                  <span className="absolute inset-0 rounded-lg border border-primary/20 animate-pulse" style={{ animationDuration: '2s' }} />
                </button>

                <button
                  onClick={handleRefuse}
                  className="cursor-pointer rounded-lg border border-destructive/40 bg-destructive/5 px-10 py-3 font-display text-sm uppercase tracking-[0.3em] text-destructive/70 transition-all duration-500 hover:bg-destructive/10 hover:text-destructive hover:shadow-[0_0_20px_hsl(0_62%_50%/0.2)] min-h-[48px]"
                  style={{
                    opacity: 0,
                    animation: 'awaken-btn-in 0.8s ease-out 1.2s forwards',
                  }}
                >
                  I DECLINE
                </button>
              </div>
            )}
          </div>
        )}

        {/* Button animation keyframes */}
        <style>{`
          @keyframes awaken-btn-in {
            0% { opacity: 0; transform: translateY(12px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Scanline effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(187 100% 50% / 0.1) 2px, hsl(187 100% 50% / 0.1) 4px)',
        }}
      />
    </div>
  );
}

// ── Exports for detection ────────────────────────────────────────────

export { isFirstRun, SYSTEM_ACTIVATED_KEY };
