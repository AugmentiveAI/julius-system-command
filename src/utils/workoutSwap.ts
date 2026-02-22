import { WorkoutType, WEEKLY_SCHEDULE, WORKOUT_MUSCLE_MAP, MuscleGroup } from '@/types/training';
import { getWorkoutRecoveryReport, getWorkoutReadiness } from '@/utils/muscleRecovery';

// ── Types ────────────────────────────────────────────────────────────

export interface SwapDecision {
  originalType: WorkoutType;
  finalType: WorkoutType;
  swapped: boolean;
  reason: string;
  originalReadiness: number;
  finalReadiness: number;
}

// Workout types eligible for swapping (excludes rest/mobility)
const SWAPPABLE_TYPES: WorkoutType[] = [
  'push-hypertrophy',
  'pull-hypertrophy',
  'legs-core',
  'push-pull-power',
  'peloton-pz-endurance',
  'peloton-pz-max',
];

// ── Swap Engine ──────────────────────────────────────────────────────

/**
 * Determines if today's scheduled workout should be swapped
 * based on muscle recovery status. Returns the best alternative
 * or falls back to active recovery.
 */
export function evaluateWorkoutSwap(now: Date = new Date()): SwapDecision {
  const dayOfWeek = now.getDay();
  const originalType = WEEKLY_SCHEDULE[dayOfWeek];

  // Don't swap rest days or animal flow (recovery days)
  if (originalType === 'rest' || originalType === 'animal-flow') {
    return {
      originalType,
      finalType: originalType,
      swapped: false,
      reason: '',
      originalReadiness: 100,
      finalReadiness: 100,
    };
  }

  const originalReadiness = getWorkoutReadiness(originalType, now);

  // If readiness is above threshold, no swap needed
  if (originalReadiness >= 60) {
    return {
      originalType,
      finalType: originalType,
      swapped: false,
      reason: '',
      originalReadiness,
      finalReadiness: originalReadiness,
    };
  }

  // Find the best alternative workout
  const soreGroups = getWorkoutRecoveryReport(originalType, now)
    .filter(r => r.status === 'sore')
    .map(r => r.muscleGroup);

  // Score each alternative workout by readiness
  const candidates = SWAPPABLE_TYPES
    .filter(t => t !== originalType)
    .map(type => ({
      type,
      readiness: getWorkoutReadiness(type, now),
      targetMuscles: WORKOUT_MUSCLE_MAP[type],
    }))
    .filter(c => c.readiness >= 60) // Only consider recovered alternatives
    .sort((a, b) => b.readiness - a.readiness);

  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      originalType,
      finalType: best.type,
      swapped: true,
      reason: buildSwapReason(originalType, best.type, soreGroups, best.readiness),
      originalReadiness,
      finalReadiness: best.readiness,
    };
  }

  // No good alternatives — fall back to active recovery
  return {
    originalType,
    finalType: 'animal-flow',
    swapped: true,
    reason: `All major muscle groups still recovering. System prescribes active recovery to maintain movement quality without compromising gains.`,
    originalReadiness,
    finalReadiness: 100,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildSwapReason(
  original: WorkoutType,
  replacement: WorkoutType,
  soreGroups: MuscleGroup[],
  newReadiness: number,
): string {
  const soreLabel = soreGroups.slice(0, 2).join(' + ');
  const originalLabel = formatWorkoutLabel(original);
  const replacementLabel = formatWorkoutLabel(replacement);

  return `${soreLabel} still recovering from recent training. System swapped ${originalLabel} → ${replacementLabel} (${newReadiness}% readiness). Train smart, not stupid.`;
}

function formatWorkoutLabel(type: WorkoutType): string {
  const labels: Record<WorkoutType, string> = {
    'push-hypertrophy': 'Push',
    'pull-hypertrophy': 'Pull',
    'legs-core': 'Legs',
    'push-pull-power': 'Power',
    'peloton-pz-endurance': 'PZ Endurance',
    'peloton-pz-max': 'PZ Max',
    'animal-flow': 'Animal Flow',
    'rest': 'Rest',
  };
  return labels[type] || type;
}
