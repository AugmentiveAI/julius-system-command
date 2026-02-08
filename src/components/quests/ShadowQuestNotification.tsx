import { useEffect, useState } from 'react';

interface ShadowQuestNotificationProps {
  show: boolean;
  onDismiss: () => void;
}

export const ShadowQuestNotification = ({ show, onDismiss }: ShadowQuestNotificationProps) => {
  const [phase, setPhase] = useState<'initial' | 'reveal' | 'done'>('initial');

  useEffect(() => {
    if (!show) {
      setPhase('initial');
      return;
    }

    // Phase 1: "SHADOW QUEST DETECTED" for 1.5s
    setPhase('initial');
    const t1 = setTimeout(() => setPhase('reveal'), 1500);
    // Phase 2: reveal message for 2.5s, then dismiss
    const t2 = setTimeout(() => {
      setPhase('done');
      onDismiss();
    }, 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show, onDismiss]);

  if (!show || phase === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-scale-in pointer-events-auto">
        <div className="rounded-lg border border-secondary/50 bg-background/95 px-8 py-6 text-center shadow-2xl backdrop-blur-sm"
          style={{ boxShadow: '0 0 40px hsl(263 91% 66% / 0.3), 0 0 80px hsl(263 91% 66% / 0.1)' }}
        >
          {phase === 'initial' ? (
            <div className="space-y-2 animate-fade-in">
              <p className="font-mono text-lg font-bold tracking-[0.2em] text-secondary text-glow-secondary">
                ⬛ SHADOW QUEST DETECTED
              </p>
              <div className="h-0.5 w-16 mx-auto bg-secondary/50 animate-persuasion-pulse" />
            </div>
          ) : (
            <div className="space-y-2 animate-fade-in">
              <p className="font-mono text-lg font-bold tracking-[0.2em] text-secondary text-glow-secondary">
                ⬛ SHADOW QUEST DETECTED
              </p>
              <p className="font-mono text-sm text-muted-foreground italic">
                A hidden quest has materialized from the shadows.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
