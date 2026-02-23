/**
 * Progressive Overload Engine
 * Auto-detects training level, tracks volume per exercise,
 * and prescribes incremental increases session-over-session.
 */

import {
  OverloadState,
  ExerciseLog,
  ExerciseHistory,
  OverloadPrescription,
  TrainingLevel,
  WEIGHT_INCREMENT,
  REP_CEILING,
  CALIBRATION_SESSIONS,
} from '@/types/overload';

const OVERLOAD_KEY = 'systemOverloadState';

// ── State Management ─────────────────────────────────────────────────

export function getOverloadState(): OverloadState {
  try {
    const stored = localStorage.getItem(OVERLOAD_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    history: [],
    detectedLevel: 'beginner',
    sessionsLogged: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function saveOverloadState(state: OverloadState): void {
  localStorage.setItem(OVERLOAD_KEY, JSON.stringify(state));
}

// ── Level Detection ──────────────────────────────────────────────────

/**
 * Auto-detect training level from logged data.
 * - Beginner: < 3 sessions OR average weight is low relative to compound lifts
 * - Intermediate: 3-20 sessions with consistent weight progression
 * - Advanced: 20+ sessions with plateaus (weight didn't increase 3+ sessions)
 */
export function detectTrainingLevel(state: OverloadState): TrainingLevel {
  if (state.sessionsLogged < CALIBRATION_SESSIONS) return 'beginner';

  // Check for compound lift weights as a signal
  const compoundIds = ['barbell-bench', 'standing-ohp', 'leg-press', 'rdl', 'pendlay-row', 'weighted-pullups'];
  const compoundHistories = state.history.filter(h => compoundIds.includes(h.exerciseId));

  if (compoundHistories.length === 0) {
    // No compound data yet — use session count
    return state.sessionsLogged >= 20 ? 'intermediate' : 'beginner';
  }

  // Check if weights have plateaued (same weight for 3+ consecutive sessions)
  let plateauCount = 0;
  for (const hist of compoundHistories) {
    const weightedLogs = hist.logs.filter(l => l.weight && l.weight > 0).slice(-5);
    if (weightedLogs.length >= 3) {
      const lastThree = weightedLogs.slice(-3).map(l => l.weight);
      if (lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
        plateauCount++;
      }
    }
  }

  if (state.sessionsLogged >= 20 && plateauCount >= 2) return 'advanced';
  if (state.sessionsLogged >= CALIBRATION_SESSIONS) return 'intermediate';
  return 'beginner';
}

// ── Log a Completed Workout ──────────────────────────────────────────

export function logExerciseCompletion(
  exerciseId: string,
  exerciseName: string,
  sets: number,
  reps: string,
  weight?: number,
  rpe?: number,
): void {
  const state = getOverloadState();
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const log: ExerciseLog = {
    exerciseId,
    date: today,
    sets,
    reps,
    weight,
    rpe,
    completed: true,
  };

  // Find or create history entry
  let history = state.history.find(h => h.exerciseId === exerciseId);
  if (!history) {
    history = { exerciseId, exerciseName, logs: [] };
    state.history.push(history);
  }

  // Replace if already logged today, otherwise append
  const todayIndex = history.logs.findIndex(l => l.date === today);
  if (todayIndex >= 0) {
    history.logs[todayIndex] = log;
  } else {
    history.logs.push(log);
  }

  // Keep last 30 logs per exercise
  if (history.logs.length > 30) {
    history.logs = history.logs.slice(-30);
  }

  state.lastUpdated = now;
  state.detectedLevel = detectTrainingLevel(state);
  saveOverloadState(state);
}

/** Increment session counter (call once per workout completion) */
export function incrementSessionCount(): void {
  const state = getOverloadState();
  state.sessionsLogged += 1;
  state.detectedLevel = detectTrainingLevel(state);
  state.lastUpdated = new Date().toISOString();
  saveOverloadState(state);
}

// ── Prescription Engine ──────────────────────────────────────────────

/**
 * For a given exercise, look at last session's data and prescribe progression.
 */
export function prescribeOverload(
  exerciseId: string,
  exerciseName: string,
  currentSets: number,
  currentReps: string,
): OverloadPrescription {
  const state = getOverloadState();
  const level = state.detectedLevel;
  const history = state.history.find(h => h.exerciseId === exerciseId);

  // First session — no history
  if (!history || history.logs.length === 0) {
    return {
      exerciseId,
      exerciseName,
      lastReps: currentReps,
      suggestedReps: currentReps,
      lastSets: currentSets,
      suggestedSets: currentSets,
      progression: 'first-session',
      progressionNote: 'First session — find your working weight. Focus on form.',
    };
  }

  const lastLog = history.logs[history.logs.length - 1];
  const increment = WEIGHT_INCREMENT[level];
  const repCeiling = REP_CEILING[level];

  // Parse last reps to check if ceiling was hit
  const lastRepMax = parseRepMax(lastLog.reps);
  const hasWeight = lastLog.weight && lastLog.weight > 0;

  // Decision tree
  if (hasWeight && lastRepMax >= repCeiling) {
    // Hit rep ceiling → increase weight, reset reps
    return {
      exerciseId,
      exerciseName,
      lastWeight: lastLog.weight,
      suggestedWeight: (lastLog.weight || 0) + increment,
      lastReps: lastLog.reps,
      suggestedReps: dropReps(currentReps, 2),
      lastSets: lastLog.sets,
      suggestedSets: currentSets,
      progression: 'increase-weight',
      progressionNote: `Hit ${lastRepMax} reps last time. Add ${increment} lbs, drop reps.`,
    };
  }

  if (hasWeight && lastRepMax < repCeiling) {
    // Under rep ceiling → increase reps at same weight
    return {
      exerciseId,
      exerciseName,
      lastWeight: lastLog.weight,
      suggestedWeight: lastLog.weight,
      lastReps: lastLog.reps,
      suggestedReps: bumpReps(lastLog.reps, 1),
      lastSets: lastLog.sets,
      suggestedSets: currentSets,
      progression: 'increase-reps',
      progressionNote: `Same weight, push for +1 rep per set.`,
    };
  }

  // No weight tracked — suggest holding and adding weight tracking
  return {
    exerciseId,
    exerciseName,
    lastReps: lastLog.reps,
    suggestedReps: currentReps,
    lastSets: lastLog.sets,
    suggestedSets: currentSets,
    progression: 'hold',
    progressionNote: 'Track your weight to unlock auto-progression.',
  };
}

/** Get prescriptions for all exercises in a workout */
export function getWorkoutOverloadPlan(
  exercises: { id: string; name: string; sets: number; reps: string }[],
): OverloadPrescription[] {
  return exercises.map(ex => prescribeOverload(ex.id, ex.name, ex.sets, ex.reps));
}

// ── Helpers ──────────────────────────────────────────────────────────

function parseRepMax(reps: string): number {
  if (reps.includes('min')) return 0; // time-based, skip
  const match = reps.match(/(\d+)(?:\s*-?\s*(\d+))?/);
  if (!match) return 0;
  return match[2] ? parseInt(match[2]) : parseInt(match[1]);
}

function dropReps(reps: string, amount: number): string {
  if (reps.includes('min')) return reps;
  const match = reps.match(/(\d+)(?:\s*-?\s*(\d+))?/);
  if (!match) return reps;
  const low = Math.max(1, parseInt(match[1]) - amount);
  const high = match[2] ? Math.max(2, parseInt(match[2]) - amount) : low;
  const suffix = reps.replace(/\d+(?:\s*-?\s*\d+)?/, '').trim();
  return low === high ? `${low}${suffix ? ' ' + suffix : ''}` : `${low}-${high}${suffix ? ' ' + suffix : ''}`;
}

function bumpReps(reps: string, amount: number): string {
  if (reps.includes('min')) return reps;
  const match = reps.match(/(\d+)(?:\s*-?\s*(\d+))?/);
  if (!match) return reps;
  const low = parseInt(match[1]) + amount;
  const high = match[2] ? parseInt(match[2]) + amount : low;
  const suffix = reps.replace(/\d+(?:\s*-?\s*\d+)?/, '').trim();
  return low === high ? `${low}${suffix ? ' ' + suffix : ''}` : `${low}-${high}${suffix ? ' ' + suffix : ''}`;
}
