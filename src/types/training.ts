export type WorkoutType =
  | 'push-hypertrophy'
  | 'pull-hypertrophy'
  | 'legs-core'
  | 'push-pull-power'
  | 'peloton-pz-endurance'
  | 'peloton-pz-max'
  | 'animal-flow'
  | 'rest';

export type IntensityLevel = 'heavy' | 'moderate' | 'light';

export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'back'
  | 'biceps'
  | 'legs'
  | 'core'
  | 'cardio'
  | 'mobility';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  completed: boolean;
  muscleGroups?: MuscleGroup[];
}

export interface Workout {
  type: WorkoutType;
  label: string;
  color: string;
  xp: number;
  exercises: Exercise[];
}

export interface MuscleRecoveryEntry {
  muscleGroup: MuscleGroup;
  lastTrainedAt: string; // ISO string
  intensity: IntensityLevel;
  sets: number;
}

export interface MuscleRecoveryState {
  entries: MuscleRecoveryEntry[];
  lastUpdated: string;
}

export const WEEKLY_SCHEDULE: Record<number, WorkoutType> = {
  0: 'animal-flow',         // Sunday
  1: 'push-hypertrophy',    // Monday
  2: 'peloton-pz-endurance', // Tuesday
  3: 'pull-hypertrophy',    // Wednesday
  4: 'legs-core',           // Thursday
  5: 'push-pull-power',     // Friday
  6: 'peloton-pz-max',      // Saturday
};

// Muscle groups targeted by each workout type
export const WORKOUT_MUSCLE_MAP: Record<WorkoutType, MuscleGroup[]> = {
  'push-hypertrophy': ['chest', 'shoulders', 'triceps'],
  'pull-hypertrophy': ['back', 'biceps'],
  'legs-core': ['legs', 'core'],
  'push-pull-power': ['chest', 'shoulders', 'back', 'triceps'],
  'peloton-pz-endurance': ['cardio', 'legs'],
  'peloton-pz-max': ['cardio', 'legs'],
  'animal-flow': ['mobility', 'core'],
  'rest': ['mobility'],
};

// Recovery time (hours) needed per muscle group before heavy training again
export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 72,
  shoulders: 48,
  triceps: 48,
  back: 72,
  biceps: 48,
  legs: 72,
  core: 24,
  cardio: 24,
  mobility: 0,
};
