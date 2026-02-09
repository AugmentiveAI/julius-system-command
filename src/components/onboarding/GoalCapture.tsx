import { useState, useCallback } from 'react';

interface GoalCaptureProps {
  onSubmit: (goal: string) => void;
}

export function GoalCapture({ onSubmit }: GoalCaptureProps) {
  const [goal, setGoal] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!goal.trim()) return;
    setSubmitted(true);
    setTimeout(() => onSubmit(goal.trim()), 1500);
  }, [goal, onSubmit]);

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="mx-auto max-w-md px-6 text-center space-y-4 animate-in fade-in duration-700">
          <p className="font-mono text-sm text-primary">
            The System has recorded your purpose.
          </p>
          <p className="font-mono text-xs text-muted-foreground italic">
            Every pillar you complete moves you closer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(187 100% 50% / 0.03) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-md px-6 space-y-6">
        <div className="space-y-3 text-center">
          <p className="font-mono text-[10px] tracking-[0.3em] text-primary uppercase">
            System Calibration
          </p>
          <h2 className="font-display text-xl font-bold text-foreground">
            What are you building toward?
          </h2>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            One sentence. Your dream. Your mission.
            <br />
            The System will use this to hold you accountable.
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Build Augmentive to $10K MRR"
            maxLength={120}
            className="w-full rounded-lg border border-border bg-card/80 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <button
            onClick={handleSubmit}
            disabled={!goal.trim()}
            className={`w-full py-3 rounded-lg font-mono text-sm tracking-[0.15em] font-semibold transition-all ${
              goal.trim()
                ? 'border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border border-border text-muted-foreground/40 cursor-not-allowed'
            }`}
            style={goal.trim() ? { boxShadow: '0 0 20px hsl(187 100% 50% / 0.15)' } : undefined}
          >
            CONFIRM PURPOSE
          </button>

          <button
            onClick={() => onSubmit('becoming the person I know I can be')}
            className="w-full py-2 font-mono text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
