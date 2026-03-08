import { useState, useMemo } from 'react';
import { Check, TrendingUp, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { RPESlider } from './RPESlider';
import { Exercise } from '@/types/training';
import { OverloadPrescription } from '@/types/overload';
import { PersonalRecord } from '@/hooks/useTrainingLog';

export interface ExerciseSetData {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

export interface ExerciseTrackingData {
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSetData[];
  allSetsComplete: boolean;
}

interface ExerciseProgressCardProps {
  exercise: Exercise;
  overload?: OverloadPrescription;
  personalRecord?: PersonalRecord | null;
  lastSession?: { weight: number; reps: number; rpe: number } | null;
  disabled?: boolean;
  onSetComplete: (exerciseId: string, setData: ExerciseSetData) => void;
  onAllComplete: (exerciseId: string) => void;
  trackingData?: ExerciseTrackingData;
}

// Check if exercise uses weight tracking (skip for cardio/mobility/timed exercises)
function isWeightExercise(exercise: Exercise): boolean {
  const reps = exercise.reps.toLowerCase();
  return !reps.includes('min') && !reps.includes('sec');
}

function parseTargetReps(repsStr: string): number {
  // Parse "8-10" → 8, "12" → 12, "10-12 each" → 10
  const match = repsStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 10;
}

export function ExerciseProgressCard({
  exercise,
  overload,
  personalRecord,
  lastSession,
  disabled = false,
  onSetComplete,
  onAllComplete,
  trackingData,
}: ExerciseProgressCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [weight, setWeight] = useState(lastSession?.weight ?? 0);
  const [reps, setReps] = useState(parseTargetReps(exercise.reps));
  const [rpe, setRpe] = useState(7);

  const usesWeight = isWeightExercise(exercise);
  const completedSets = trackingData?.sets.filter(s => s.completed).length ?? 0;
  const allDone = completedSets >= exercise.sets;
  const hasProgression = overload && overload.progression !== 'first-session' && overload.progression !== 'hold';

  // PR proximity check
  const isPRAttempt = useMemo(() => {
    if (!personalRecord || !usesWeight) return false;
    return weight >= personalRecord.maxWeight;
  }, [personalRecord, weight, usesWeight]);

  const handleLogSet = () => {
    const setData: ExerciseSetData = {
      setNumber: currentSetIndex + 1,
      weight,
      reps,
      rpe,
      completed: true,
    };
    onSetComplete(exercise.id, setData);

    const nextSet = currentSetIndex + 1;
    if (nextSet >= exercise.sets) {
      onAllComplete(exercise.id);
    } else {
      setCurrentSetIndex(nextSet);
    }
  };

  return (
    <div className={`rounded-lg border transition-all ${
      allDone
        ? 'border-green-500/30 bg-green-500/5'
        : expanded
        ? 'border-primary/40 bg-card'
        : 'border-border bg-card/50'
    }`}>
      {/* Header — always visible */}
      <button
        onClick={() => !disabled && setExpanded(!expanded)}
        disabled={disabled}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Completion indicator */}
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
          allDone
            ? 'border-green-500 bg-green-500'
            : 'border-muted-foreground'
        }`}>
          {allDone && <Check className="h-3 w-3 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`font-tech text-sm truncate ${
              allDone ? 'text-muted-foreground line-through' : 'text-foreground'
            }`}>
              {exercise.name}
            </p>
            {isPRAttempt && !allDone && (
              <Trophy className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            )}
          </div>

          {/* Progression hint */}
          {hasProgression && !allDone && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="font-mono text-[10px] text-primary truncate">
                {overload.progressionNote}
                {overload.suggestedWeight && ` → ${overload.suggestedWeight} lbs`}
              </span>
            </div>
          )}
          {overload?.progression === 'first-session' && !allDone && (
            <span className="font-mono text-[10px] text-muted-foreground mt-0.5 block">
              {overload.progressionNote}
            </span>
          )}
        </div>

        {/* Sets progress + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-muted-foreground">
            {completedSets}/{exercise.sets} × {exercise.reps}
          </span>
          {!disabled && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded set logging */}
      {expanded && !allDone && !disabled && usesWeight && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Set indicator */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: exercise.sets }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < completedSets
                    ? 'bg-green-500'
                    : i === currentSetIndex
                    ? 'bg-primary'
                    : 'bg-muted/30'
                }`}
              />
            ))}
          </div>

          <p className="font-mono text-[10px] text-muted-foreground text-center">
            Set {currentSetIndex + 1} of {exercise.sets}
          </p>

          {/* Weight + Reps inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Weight (lbs)
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeight(w => Math.max(0, w - 5))}
                  className="h-8 w-8 rounded border border-border bg-background/50 font-mono text-sm text-muted-foreground hover:bg-muted"
                >
                  −
                </button>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="h-8 w-full rounded border border-border bg-background/50 text-center font-mono text-sm text-foreground"
                />
                <button
                  onClick={() => setWeight(w => w + 5)}
                  className="h-8 w-8 rounded border border-border bg-background/50 font-mono text-sm text-muted-foreground hover:bg-muted"
                >
                  +
                </button>
              </div>
              {lastSession && (
                <p className="font-mono text-[9px] text-muted-foreground text-center">
                  Last: {lastSession.weight} lbs
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Reps
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setReps(r => Math.max(1, r - 1))}
                  className="h-8 w-8 rounded border border-border bg-background/50 font-mono text-sm text-muted-foreground hover:bg-muted"
                >
                  −
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={e => setReps(Number(e.target.value))}
                  className="h-8 w-full rounded border border-border bg-background/50 text-center font-mono text-sm text-foreground"
                />
                <button
                  onClick={() => setReps(r => r + 1)}
                  className="h-8 w-8 rounded border border-border bg-background/50 font-mono text-sm text-muted-foreground hover:bg-muted"
                >
                  +
                </button>
              </div>
              {lastSession && (
                <p className="font-mono text-[9px] text-muted-foreground text-center">
                  Last: {lastSession.reps} reps
                </p>
              )}
            </div>
          </div>

          {/* RPE */}
          <RPESlider value={rpe} onChange={setRpe} compact />

          {/* PR alert */}
          {isPRAttempt && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-center">
              <p className="font-mono text-[10px] text-yellow-400">
                🏆 PR Attempt — Current record: {personalRecord?.maxWeight} lbs × {personalRecord?.maxReps}
              </p>
            </div>
          )}

          {/* Log Set Button */}
          <button
            onClick={handleLogSet}
            className="w-full rounded-lg bg-primary py-2.5 font-display text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            Log Set {currentSetIndex + 1}
          </button>
        </div>
      )}

      {/* Expanded for non-weight exercises (just complete toggle) */}
      {expanded && !allDone && !disabled && !usesWeight && (
        <div className="px-3 pb-3 border-t border-border/50 pt-3">
          <button
            onClick={() => {
              // Complete all sets at once for non-weight exercises
              for (let i = 0; i < exercise.sets; i++) {
                onSetComplete(exercise.id, {
                  setNumber: i + 1,
                  weight: 0,
                  reps: 1,
                  rpe: 5,
                  completed: true,
                });
              }
              onAllComplete(exercise.id);
            }}
            className="w-full rounded-lg bg-primary py-2.5 font-display text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}
