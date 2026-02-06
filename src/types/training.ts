export type WorkoutType =
  | 'push-hypertrophy'
  | 'pull-hypertrophy'
  | 'legs-core'
  | 'push-pull-power'
  | 'peloton-pz-endurance'
  | 'peloton-pz-max'
  | 'animal-flow'
  | 'rest';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  completed: boolean;
}

export interface Workout {
  type: WorkoutType;
  label: string;
  color: string;
  xp: number;
  exercises: Exercise[];
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
