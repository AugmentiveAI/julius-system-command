import { useEffect, useState } from 'react';
import { FocusQuest } from '@/hooks/useFocusMode';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';
import { QuestPersuasionData } from '@/hooks/usePersuasion';

interface FocusModeOverlayProps {
  active: boolean;
  currentQuest: FocusQuest | null;
  allDone: boolean;
  remainingCount: number;
  totalCount: number;
  completedCount: number;
  lastXPAwarded: number | null;
  showXPAnimation: boolean;
  persuasionData: QuestPersuasionData | null;
  sprintTimeRemaining: string | null;
  onComplete: () => void;
  onSkip: () => void;
  onExit: () => void;
  onCompleteQuest: (questId: string) => void;
}

const DiffBadge = ({ d }: { d: string }) => {
  const c = DIFFICULTY_BADGE_CONFIG[d as QuestDifficulty];
  if (!c) return null;
  return (
    <span
      className={`inline-flex items-center justify-center h-7 w-7 rounded text-xs font-mono font-bold border ${c.className}`}
      style={c.glow ? { boxShadow: c.glow } : undefined}
    >
      {c.label}
    </span>
  );
};

export const FocusModeOverlay = ({
  active,
  currentQuest,
  allDone,
  remainingCount,
  totalCount,
  completedCount,
  lastXPAwarded,
  showXPAnimation,
  persuasionData,
  sprintTimeRemaining,
  onComplete,
  onSkip,
  onExit,
  onCompleteQuest,
}: FocusModeOverlayProps) => {
  const [skipMessage, setSkipMessage] = useState<string | null>(null);

  // Clear skip message after delay
  useEffect(() => {
    if (skipMessage) {
      const t = setTimeout(() => setSkipMessage(null), 1500);
      return () => clearTimeout(t);
    }
  }, [skipMessage]);

  if (!active) return null;

  // All done screen
  if (allDone) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background" style={{ minHeight: '100dvh' }}>
        <div className="text-center space-y-6 px-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            STATUS
          </p>
          <h1 className="font-display text-2xl text-foreground">
            All quests complete.
          </h1>
          <p className="font-display text-lg text-primary text-glow-primary">
            You're free.
          </p>
          <div className="pt-8">
            <button
              onClick={onExit}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              EXIT FOCUS MODE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No quest available
  if (!currentQuest) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background" style={{ minHeight: '100dvh' }}>
        <div className="text-center space-y-4 px-8">
          <p className="font-mono text-sm text-muted-foreground">
            No quests available. Run a scan first.
          </p>
          <button
            onClick={onExit}
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            EXIT
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    onCompleteQuest(currentQuest.id);
    onComplete();
  };

  const handleSkip = () => {
    // Show persuasion message on skip if available
    if (persuasionData?.message) {
      setSkipMessage(persuasionData.message);
    }
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background" style={{ minHeight: '100dvh' }}>
      {/* Top bar area — sprint counter + progress */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
        {sprintTimeRemaining && (
          <span className="font-mono text-xs text-primary/70">
            ⏱ {sprintTimeRemaining}
          </span>
        )}
        <button
          onClick={onExit}
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          EXIT
        </button>
      </div>

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* XP animation */}
        {showXPAnimation && lastXPAwarded && (
          <div
            className="absolute text-primary font-display text-2xl font-bold text-glow-primary"
            style={{
              animation: 'focusXPFloat 1.2s ease-out forwards',
            }}
          >
            +{lastXPAwarded} XP
          </div>
        )}

        {/* Skip message flash */}
        {skipMessage && (
          <div className="absolute top-1/4 px-6 text-center">
            <p className="font-mono text-xs text-destructive/80 italic animate-pulse">
              {skipMessage}
            </p>
          </div>
        )}

        {/* "NEXT:" label */}
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
          NEXT
        </p>

        {/* Quest name */}
        <h1 className="font-display text-xl sm:text-2xl text-center text-foreground leading-tight mb-4 max-w-sm">
          {currentQuest.title}
        </h1>

        {/* Difficulty + XP */}
        <div className="flex items-center gap-3 mb-6">
          <DiffBadge d={currentQuest.difficulty} />
          <span className="font-mono text-sm text-primary font-bold text-glow-primary">
            +{currentQuest.xp} XP
          </span>
        </div>

        {/* Persuasion message */}
        {persuasionData?.message && !skipMessage && (
          <p className="font-mono text-[11px] italic text-muted-foreground text-center max-w-xs mb-10 leading-relaxed">
            {persuasionData.message}
          </p>
        )}

        {!persuasionData?.message && <div className="mb-10" />}

        {/* COMPLETE button */}
        <button
          onClick={handleComplete}
          className="w-full max-w-xs h-14 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-widest uppercase transition-all hover:shadow-[0_0_24px_hsl(187_100%_50%/0.4)] active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        >
          COMPLETE
        </button>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          className="mt-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
        >
          SKIP
        </button>
      </div>

      {/* XP float animation */}
      <style>{`
        @keyframes focusXPFloat {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-60px); }
        }
      `}</style>
    </div>
  );
};
