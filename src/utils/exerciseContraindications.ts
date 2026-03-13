import { RehabPhase } from '@/types/player';

export interface ExerciseFlag {
  exercise: string;
  reason: string;
  unlocksAt: string;
}

export function getContraindications(romLeft: number, romRight: number, rehabPhase: RehabPhase): ExerciseFlag[] {
  const weaker = Math.min(romLeft, romRight);
  const flags: ExerciseFlag[] = [];

  if (weaker < 95) {
    flags.push(
      { exercise: 'Running', reason: 'Patellar tendon load — wait for 95% ROM', unlocksAt: '95% ROM on both knees' },
      { exercise: 'Jumping', reason: 'Impact loading — dangerous below 95% ROM', unlocksAt: '95% ROM + power phase' },
      { exercise: 'Plyometrics', reason: 'Impact loading — dangerous below 95% ROM', unlocksAt: '95% ROM + power phase' },
      { exercise: 'Box Jumps', reason: 'High impact — patellar tendon not ready', unlocksAt: 'Performance phase' },
      { exercise: 'Deep Squats', reason: 'Excessive knee flexion angle', unlocksAt: '100% ROM' },
    );
  }

  if (rehabPhase === 'mobility' || rehabPhase === 'strength') {
    flags.push(
      { exercise: 'Leg Press', reason: 'Compressive force on healing tendon', unlocksAt: 'Power phase' },
      { exercise: 'Bulgarian Split Squats', reason: 'Asymmetric tendon stress', unlocksAt: '95% ROM' },
      { exercise: 'Sprinting', reason: 'Max patellar tendon load', unlocksAt: 'Performance phase' },
    );
  }

  return flags;
}

export function isExerciseSafe(exerciseName: string, romLeft: number, romRight: number, rehabPhase: RehabPhase): boolean {
  const flags = getContraindications(romLeft, romRight, rehabPhase);
  return !flags.some(f => exerciseName.toLowerCase().includes(f.exercise.toLowerCase()));
}

export function getExerciseWarning(exerciseName: string, romLeft: number, romRight: number, rehabPhase: RehabPhase): ExerciseFlag | null {
  const flags = getContraindications(romLeft, romRight, rehabPhase);
  return flags.find(f => exerciseName.toLowerCase().includes(f.exercise.toLowerCase())) ?? null;
}
