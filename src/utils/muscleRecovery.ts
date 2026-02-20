import {
  MuscleGroup,
  MuscleRecoveryState,
  MuscleRecoveryEntry,
  IntensityLevel,
  WorkoutType,
  WORKOUT_MUSCLE_MAP,
  RECOVERY_HOURS,
} from '@/types/training';

const RECOVERY_KEY = 'systemMuscleRecovery';

// ── Recovery Status ──────────────────────────────────────────────────

export type RecoveryStatus = 'fresh' | 'recovered' | 'partial' | 'sore';

export interface MuscleRecoveryReport {
  muscleGroup: MuscleGroup;
  status: RecoveryStatus;
  hoursRemaining: number;   // 0 = fully recovered
  percentRecovered: number; // 0-100
  lastIntensity: IntensityLevel | null;
}

export function getRecoveryState(): MuscleRecoveryState {
  try {
    const stored = localStorage.getItem(RECOVERY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { entries: [], lastUpdated: new Date().toISOString() };
}

function saveRecoveryState(state: MuscleRecoveryState): void {
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(state));
}

/** Log that a workout was completed — records muscle group training timestamps */
export function logWorkoutRecovery(
  workoutType: WorkoutType,
  intensity: IntensityLevel,
  exercises: { sets: number; muscleGroups?: MuscleGroup[] }[],
): void {
  const state = getRecoveryState();
  const now = new Date().toISOString();
  const muscleGroups = WORKOUT_MUSCLE_MAP[workoutType];

  // Calculate total sets per muscle group from exercises
  const setsPerGroup: Partial<Record<MuscleGroup, number>> = {};
  for (const mg of muscleGroups) {
    setsPerGroup[mg] = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  }

  // Update entries — replace existing or add new
  const updated = state.entries.filter(
    e => !muscleGroups.includes(e.muscleGroup)
  );

  for (const mg of muscleGroups) {
    updated.push({
      muscleGroup: mg,
      lastTrainedAt: now,
      intensity,
      sets: setsPerGroup[mg] || 0,
    });
  }

  saveRecoveryState({ entries: updated, lastUpdated: now });
}

/** Get recovery report for all muscle groups */
export function getFullRecoveryReport(now: Date = new Date()): MuscleRecoveryReport[] {
  const state = getRecoveryState();
  const allGroups: MuscleGroup[] = [
    'chest', 'shoulders', 'triceps', 'back', 'biceps', 'legs', 'core', 'cardio', 'mobility',
  ];

  return allGroups.map(mg => {
    const entry = state.entries.find(e => e.muscleGroup === mg);
    if (!entry) {
      return {
        muscleGroup: mg,
        status: 'fresh' as RecoveryStatus,
        hoursRemaining: 0,
        percentRecovered: 100,
        lastIntensity: null,
      };
    }

    const baseRecovery = RECOVERY_HOURS[mg];
    // Adjust recovery time by intensity
    const intensityMultiplier = entry.intensity === 'heavy' ? 1.0 : entry.intensity === 'moderate' ? 0.7 : 0.4;
    const requiredHours = baseRecovery * intensityMultiplier;

    const hoursSinceTrained = (now.getTime() - new Date(entry.lastTrainedAt).getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, requiredHours - hoursSinceTrained);
    const percentRecovered = Math.min(100, Math.round((hoursSinceTrained / requiredHours) * 100));

    let status: RecoveryStatus;
    if (percentRecovered >= 100) status = 'recovered';
    else if (percentRecovered >= 70) status = 'partial';
    else status = 'sore';

    return {
      muscleGroup: mg,
      status,
      hoursRemaining: Math.round(hoursRemaining),
      percentRecovered,
      lastIntensity: entry.intensity,
    };
  });
}

/** Get recovery report for muscles targeted by a specific workout */
export function getWorkoutRecoveryReport(
  workoutType: WorkoutType,
  now: Date = new Date(),
): MuscleRecoveryReport[] {
  const fullReport = getFullRecoveryReport(now);
  const targetMuscles = WORKOUT_MUSCLE_MAP[workoutType];
  return fullReport.filter(r => targetMuscles.includes(r.muscleGroup));
}

/** Overall readiness score 0-100 for a given workout type */
export function getWorkoutReadiness(workoutType: WorkoutType, now: Date = new Date()): number {
  const reports = getWorkoutRecoveryReport(workoutType, now);
  if (reports.length === 0) return 100;
  return Math.round(reports.reduce((sum, r) => sum + r.percentRecovered, 0) / reports.length);
}
