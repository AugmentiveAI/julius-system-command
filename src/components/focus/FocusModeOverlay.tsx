import { useEffect, useState, useMemo } from 'react';
import { FocusQuest, DegradationLevel } from '@/hooks/useFocusMode';
import { DIFFICULTY_BADGE_CONFIG, QuestDifficulty } from '@/types/questDifficulty';
import { QuestPersuasionData } from '@/hooks/usePersuasion';
import { getSystemMessage } from '@/utils/systemVoice';

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
  degradationLevel: DegradationLevel;
  sessionSkipCount: number;
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

// Degradation visual config
const DEGRADATION_STYLES: Record<DegradationLevel, {
  bgOpacity: string;
  glowOpacity: number;
  textMute: string;
  borderColor: string;
  statusText: string | null;
}> = {
  0: { bgOpacity: '', glowOpacity: 1, textMute: '', borderColor: '', statusText: null },
  1: { bgOpacity: 'opacity-95', glowOpacity: 0.7, textMute: '', borderColor: '', statusText: 'System integrity: 85%' },
  2: { bgOpacity: 'opacity-90', glowOpacity: 0.4, textMute: 'opacity-80', borderColor: 'border-yellow-500/20', statusText: 'System integrity: 60%' },
  3: { bgOpacity: 'opacity-85', glowOpacity: 0.15, textMute: 'opacity-60', borderColor: 'border-red-500/30', statusText: 'System integrity: critical' },
};

function getSkipPenaltyMessage(skipCount: number, quest: FocusQuest): string {
  // Load streak for template
  let streak = 0;
  try {
    const raw = localStorage.getItem('the-system-player');
    if (raw) streak = JSON.parse(raw).streak ?? 0;
  } catch { /* ignore */ }

  if (skipCount >= 5) {
    return getSystemMessage('skipPenaltySevere', { stat: quest.stat, streak });
  } else if (skipCount >= 3) {
    return getSystemMessage('skipPenaltyMedium', { stat: quest.stat, streak });
  } else {
    return getSystemMessage('skipPenaltyLight', { stat: quest.stat, streak });
  }
}

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
  degradationLevel,
  sessionSkipCount,
  onComplete,
  onSkip,
  onExit,
  onCompleteQuest,
}: FocusModeOverlayProps) => {
  const [skipWarning, setSkipWarning] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const degradation = DEGRADATION_STYLES[degradationLevel];

  // Clear skip warning after delay
  useEffect(() => {
    if (skipWarning) {
      const t = setTimeout(() => setSkipWarning(null), 2500);
      return () => clearTimeout(t);
    }
  }, [skipWarning]);

  // Compute glow style reduction
  const glowStyle = useMemo(() => {
    if (degradation.glowOpacity >= 1) return {};
    return { filter: `brightness(${0.5 + degradation.glowOpacity * 0.5})` };
  }, [degradation.glowOpacity]);

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
    setShowSkipConfirm(false);
  };

  const handleSkipAttempt = () => {
    // First skip is free, after that require confirmation
    if (sessionSkipCount >= 1 && !showSkipConfirm) {
      const msg = getSkipPenaltyMessage(sessionSkipCount, currentQuest);
      setSkipWarning(msg);
      setShowSkipConfirm(true);
      return;
    }
    // Execute skip
    if (sessionSkipCount === 0) {
      // First skip — show light warning after
      const msg = getSkipPenaltyMessage(1, currentQuest);
      setSkipWarning(msg);
    }
    setShowSkipConfirm(false);
    onSkip();
  };

  const handleConfirmSkip = () => {
    setShowSkipConfirm(false);
    onSkip();
  };

  // Button glow reduction based on degradation
  const completeButtonShadow = degradation.glowOpacity >= 0.7
    ? '0 0 24px hsl(187 100% 50% / 0.4)'
    : degradation.glowOpacity >= 0.3
    ? '0 0 12px hsl(187 100% 50% / 0.2)'
    : '0 0 4px hsl(187 100% 50% / 0.1)';

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-background transition-all duration-700 ${degradation.bgOpacity} ${degradation.borderColor ? `border-2 ${degradation.borderColor}` : ''}`}
      style={{ minHeight: '100dvh' }}
    >
      {/* Top bar area — sprint counter + degradation status + progress */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className={`font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground ${degradation.textMute}`}>
          {completedCount}/{totalCount}
        </span>

        <div className="flex items-center gap-3">
          {/* System integrity indicator */}
          {degradation.statusText && (
            <span className={`font-mono text-[10px] uppercase tracking-wider transition-colors duration-500 ${
              degradationLevel === 3 ? 'text-red-500 animate-pulse' :
              degradationLevel === 2 ? 'text-yellow-500' : 'text-muted-foreground/70'
            }`}>
              {degradation.statusText}
            </span>
          )}

          {sprintTimeRemaining && (
            <span className="font-mono text-xs text-primary/70">
              ⏱ {sprintTimeRemaining}
            </span>
          )}
        </div>

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
              ...glowStyle,
            }}
          >
            +{lastXPAwarded} XP
          </div>
        )}

        {/* Skip warning flash */}
        {skipWarning && (
          <div className="absolute top-1/4 px-6 text-center">
            <p className={`font-mono text-xs italic leading-relaxed transition-colors duration-300 ${
              degradationLevel >= 3 ? 'text-red-500' :
              degradationLevel >= 2 ? 'text-yellow-500/90' : 'text-destructive/80'
            }`}>
              {skipWarning}
            </p>
          </div>
        )}

        {/* "NEXT:" label */}
        <p className={`font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4 ${degradation.textMute}`}>
          NEXT
        </p>

        {/* Quest name */}
        <h1 className={`font-display text-xl sm:text-2xl text-center text-foreground leading-tight mb-4 max-w-sm transition-opacity duration-500 ${degradation.textMute}`}>
          {currentQuest.title}
        </h1>

        {/* Difficulty + XP */}
        <div className="flex items-center gap-3 mb-6" style={glowStyle}>
          <DiffBadge d={currentQuest.difficulty} />
          <span className="font-mono text-sm text-primary font-bold text-glow-primary">
            +{currentQuest.xp} XP
          </span>
        </div>

        {/* Persuasion message — hidden during skip confirm */}
        {persuasionData?.message && !skipWarning && !showSkipConfirm && (
          <p className={`font-mono text-[11px] italic text-muted-foreground text-center max-w-xs mb-10 leading-relaxed ${degradation.textMute}`}>
            {persuasionData.message}
          </p>
        )}

        {/* Skip confirmation prompt */}
        {showSkipConfirm && !skipWarning && (
          <div className="mb-10 text-center space-y-3">
            <p className={`font-mono text-xs uppercase tracking-wider ${
              degradationLevel >= 2 ? 'text-red-400' : 'text-yellow-500'
            }`}>
              Confirm skip?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleConfirmSkip}
                className={`font-mono text-xs uppercase tracking-wider px-4 py-2 rounded border transition-colors ${
                  degradationLevel >= 2
                    ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                    : 'border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10'
                }`}
              >
                Skip anyway
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                Stay
              </button>
            </div>
          </div>
        )}

        {!persuasionData?.message && !showSkipConfirm && <div className="mb-10" />}

        {/* COMPLETE button — glow degrades with skips */}
        <button
          onClick={handleComplete}
          className={`w-full max-w-xs h-14 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-widest uppercase transition-all active:scale-95 ${degradation.textMute}`}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            boxShadow: completeButtonShadow,
          }}
        >
          COMPLETE
        </button>

        {/* Skip link — changes appearance with degradation */}
        <button
          onClick={handleSkipAttempt}
          className={`mt-4 font-mono text-xs transition-colors uppercase tracking-wider ${
            degradationLevel >= 3 ? 'text-red-500/50 hover:text-red-500/70' :
            degradationLevel >= 2 ? 'text-yellow-500/60 hover:text-yellow-500/80' :
            'text-muted-foreground hover:text-foreground'
          }`}
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
