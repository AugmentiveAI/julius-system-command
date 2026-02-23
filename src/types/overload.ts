/** Progressive Overload Tracking Types */

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseLog {
  exerciseId: string;
  date: string;          // ISO date
  sets: number;
  reps: string;          // e.g. "8-10"
  weight?: number;       // lbs — optional, user can add later
  rpe?: number;          // 1-10 rate of perceived exertion
  completed: boolean;
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  logs: ExerciseLog[];
}

export interface OverloadPrescription {
  exerciseId: string;
  exerciseName: string;
  lastWeight?: number;
  suggestedWeight?: number;
  lastReps: string;
  suggestedReps: string;
  lastSets: number;
  suggestedSets: number;
  progression: 'increase-weight' | 'increase-reps' | 'increase-sets' | 'hold' | 'first-session';
  progressionNote: string;
}

export interface OverloadState {
  history: ExerciseHistory[];
  detectedLevel: TrainingLevel;
  sessionsLogged: number;
  lastUpdated: string;
}

// How many sessions needed to auto-calibrate level
export const CALIBRATION_SESSIONS = 3;

// Weight increments per level (lbs)
export const WEIGHT_INCREMENT: Record<TrainingLevel, number> = {
  beginner: 5,
  intermediate: 5,
  advanced: 2.5,
};

// Rep progression thresholds — if top-of-range reps hit, increase weight
export const REP_CEILING: Record<TrainingLevel, number> = {
  beginner: 12,
  intermediate: 10,
  advanced: 8,
};
