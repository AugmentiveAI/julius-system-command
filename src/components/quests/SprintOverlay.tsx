import { useState } from 'react';
import { X, Play, Check, Minus, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SprintState, SprintQuest } from '@/hooks/useSprintTimer';
import { CalibratedQuest } from '@/utils/questCalibration';

// ── Helpers ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Props ────────────────────────────────────────────────────────────

interface SprintOverlayProps {
  state: SprintState;
  availableQuests: CalibratedQuest[];
  completedQuestIds: Set<string>;
  onStartSprint: (quests: SprintQuest[]) => void;
  onComplete: (result: 'yes' | 'partial' | 'no') => void;
  onStartNext: () => void;
  onCancel: () => void;
  onLogSprint: () => void;
  onMarkQuestComplete: (questId: string) => void;
  isLimitReached: boolean;
}

// ── Quest Selection Screen ───────────────────────────────────────────

function QuestSelection({
  quests,
  completedIds,
  onStart,
  onCancel,
  sprintNumber,
  maxSprints,
}: {
  quests: CalibratedQuest[];
  completedIds: Set<string>;
  onStart: (selected: SprintQuest[]) => void;
  onCancel: () => void;
  sprintNumber: number;
  maxSprints: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    const sprintQuests: SprintQuest[] = quests
      .filter(q => selected.has(q.id))
      .map(q => ({
        id: q.id,
        title: q.title,
        sprintsNeeded: q.sprintCount || 1,
        sprintsCompleted: 0,
      }));
    onStart(sprintQuests);
  };

  // Auto-suggest: pick uncompleted sprint quests (S/A rank first)
  const unfinished = quests
    .filter(q => !completedIds.has(q.id) && q.sprintCount > 0)
    .sort((a, b) => {
      const order: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
      return (order[b.difficulty] || 0) - (order[a.difficulty] || 0);
    });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-mono text-sm tracking-wider text-muted-foreground">
          SPRINT {sprintNumber} OF {maxSprints}
        </h2>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 pb-3">
        <p className="font-mono text-xs text-muted-foreground">
          Select quest(s) for this sprint:
        </p>
      </div>

      {/* Quest list */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2">
        {unfinished.length === 0 && (
          <p className="text-center font-mono text-xs text-muted-foreground py-8">
            No sprint quests remaining.
          </p>
        )}
        {unfinished.map(q => {
          const isSelected = selected.has(q.id);
          return (
            <button
              key={q.id}
              onClick={() => toggleSelect(q.id)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${
                isSelected
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-card/50 hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{q.title}</span>
                <span className="text-xs font-mono text-primary">+{q.adjustedXP} XP</span>
              </div>
              {q.sprintCount > 1 && (
                <span className="text-[10px] font-mono text-muted-foreground mt-1 block">
                  Requires {q.sprintCount} sprints
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <div className="px-5 py-5">
        <Button
          onClick={handleStart}
          disabled={selected.size === 0}
          className="w-full font-mono tracking-wider"
        >
          <Play className="h-4 w-4 mr-2" />
          START SPRINT
        </Button>
      </div>
    </div>
  );
}

// ── Active Sprint Timer ──────────────────────────────────────────────

function ActiveSprint({
  state,
  onCancel,
}: {
  state: SprintState;
  onCancel: () => void;
}) {
  const isWarning = state.secondsRemaining <= 300 && state.secondsRemaining > 0; // 5 min warning

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute top-5 right-5 text-muted-foreground/40 hover:text-muted-foreground"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Sprint label */}
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground mb-8">
        SPRINT {state.currentSprint} OF {state.maxSprints}
      </p>

      {/* Timer */}
      <div
        className={`font-mono text-7xl font-bold tracking-wider text-foreground transition-all ${
          isWarning ? 'animate-pulse text-primary' : ''
        }`}
      >
        {formatTime(state.secondsRemaining)}
      </div>

      {/* Quest names */}
      <div className="mt-10 space-y-2 text-center max-w-xs">
        {state.selectedQuests.map(q => (
          <p key={q.id} className="font-mono text-sm text-muted-foreground">
            {q.title}
            {q.sprintsNeeded > 1 && (
              <span className="text-primary/60 ml-2">
                ({q.sprintsCompleted + 1}/{q.sprintsNeeded})
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Sprint Done / Completion Prompt ──────────────────────────────────

function CompletionPrompt({
  state,
  onComplete,
  onLogSprint,
  onMarkQuestComplete,
}: {
  state: SprintState;
  onComplete: (result: 'yes' | 'partial' | 'no') => void;
  onLogSprint: () => void;
  onMarkQuestComplete: (questId: string) => void;
}) {
  const handleResult = (result: 'yes' | 'partial' | 'no') => {
    onLogSprint();
    if (result === 'yes') {
      state.selectedQuests.forEach(q => {
        if (q.sprintsCompleted + 1 >= q.sprintsNeeded) {
          onMarkQuestComplete(q.id);
        }
      });
    }
    onComplete(result);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-8">
      <p className="font-mono text-sm tracking-wider text-primary mb-2">
        {state.completedAway ? 'Sprint completed while away.' : 'Sprint complete.'}
      </p>
      <p className="font-mono text-xs text-muted-foreground mb-10">
        {state.completedAway ? 'Log your progress.' : 'Did you complete the quest?'}
      </p>

      <div className="flex gap-4 w-full max-w-xs">
        <Button
          onClick={() => handleResult('yes')}
          className="flex-1 font-mono tracking-wider text-xs"
        >
          <Check className="h-4 w-4 mr-1" /> YES
        </Button>
        <Button
          onClick={() => handleResult('partial')}
          variant="outline"
          className="flex-1 font-mono tracking-wider text-xs"
        >
          <Minus className="h-4 w-4 mr-1" /> PARTIAL
        </Button>
        <Button
          onClick={() => handleResult('no')}
          variant="ghost"
          className="flex-1 font-mono tracking-wider text-xs text-muted-foreground"
        >
          <SkipForward className="h-4 w-4 mr-1" /> NO
        </Button>
      </div>
    </div>
  );
}

// ── Break Timer ──────────────────────────────────────────────────────

function BreakTimer({
  state,
  isExtended,
}: {
  state: SprintState;
  isExtended: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <p className="font-mono text-xs tracking-[0.2em] text-blue-400 mb-8">
        {isExtended ? 'EXTENDED RECOVERY' : 'RECOVERY'}
      </p>

      <div className="font-mono text-7xl font-bold tracking-wider text-blue-400">
        {formatTime(state.secondsRemaining)}
      </div>

      <p className="mt-6 font-mono text-xs text-muted-foreground/60">
        {isExtended
          ? 'Sprint limit reached. The System will not allow diminishing returns.'
          : 'Rest. Recharge. Next sprint incoming.'}
      </p>
    </div>
  );
}

// ── Ready for Next Sprint ────────────────────────────────────────────

function ReadyPrompt({
  state,
  onStartNext,
  onCancel,
  isLimitReached,
}: {
  state: SprintState;
  onStartNext: () => void;
  onCancel: () => void;
  isLimitReached: boolean;
}) {
  if (isLimitReached) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-8">
        <p className="font-mono text-sm tracking-wider text-primary mb-4">
          All sprints complete.
        </p>
        <p className="font-mono text-xs text-muted-foreground text-center mb-8">
          {state.maxSprints} of {state.maxSprints} sprints done today. The System is satisfied.
        </p>
        <Button onClick={onCancel} variant="outline" className="font-mono tracking-wider text-xs">
          CLOSE
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-8">
      <p className="font-mono text-sm tracking-wider text-foreground mb-2">
        Ready for Sprint {state.currentSprint + 1}?
      </p>
      <p className="font-mono text-xs text-muted-foreground mb-8">
        {state.maxSprints - state.currentSprint} sprint{state.maxSprints - state.currentSprint !== 1 ? 's' : ''} remaining today
      </p>
      <div className="flex gap-4">
        <Button onClick={onStartNext} className="font-mono tracking-wider text-xs">
          <Play className="h-4 w-4 mr-2" /> START
        </Button>
        <Button onClick={onCancel} variant="ghost" className="font-mono tracking-wider text-xs text-muted-foreground">
          DONE FOR NOW
        </Button>
      </div>
    </div>
  );
}

// ── Main Overlay ─────────────────────────────────────────────────────

export function SprintOverlay({
  state,
  availableQuests,
  completedQuestIds,
  onStartSprint,
  onComplete,
  onStartNext,
  onCancel,
  onLogSprint,
  onMarkQuestComplete,
  isLimitReached,
}: SprintOverlayProps) {
  if (state.phase === 'idle') return null;

  if (state.phase === 'selecting') {
    return (
      <QuestSelection
        quests={availableQuests}
        completedIds={completedQuestIds}
        onStart={onStartSprint}
        onCancel={onCancel}
        sprintNumber={state.currentSprint}
        maxSprints={state.maxSprints}
      />
    );
  }

  if (state.phase === 'sprinting') {
    return <ActiveSprint state={state} onCancel={onCancel} />;
  }

  if (state.phase === 'sprint-done') {
    return (
      <CompletionPrompt
        state={state}
        onComplete={onComplete}
        onLogSprint={onLogSprint}
        onMarkQuestComplete={onMarkQuestComplete}
      />
    );
  }

  if (state.phase === 'break') {
    return <BreakTimer state={state} isExtended={false} />;
  }

  if (state.phase === 'extended-break') {
    return <BreakTimer state={state} isExtended={true} />;
  }

  if (state.phase === 'ready') {
    return (
      <ReadyPrompt
        state={state}
        onStartNext={onStartNext}
        onCancel={onCancel}
        isLimitReached={isLimitReached}
      />
    );
  }

  return null;
}
