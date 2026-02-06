import { Workout, WorkoutType, Exercise } from '@/types/training';

const createExercise = (id: string, name: string, sets: number, reps: string): Exercise => ({
  id,
  name,
  sets,
  reps,
  completed: false,
});

export const WORKOUT_CONFIGS: Record<WorkoutType, Omit<Workout, 'exercises'> & { exercises: Omit<Exercise, 'completed'>[] }> = {
  'push-hypertrophy': {
    type: 'push-hypertrophy',
    label: 'Push Hypertrophy',
    color: 'text-blue-400',
    xp: 50,
    exercises: [
      { id: 'bench-press', name: 'Bench Press', sets: 4, reps: '8-10' },
      { id: 'incline-db-press', name: 'Incline DB Press', sets: 3, reps: '10-12' },
      { id: 'cable-flyes', name: 'Cable Flyes', sets: 3, reps: '12-15' },
      { id: 'ohp', name: 'Overhead Press', sets: 4, reps: '8-10' },
      { id: 'lateral-raises', name: 'Lateral Raises', sets: 3, reps: '12-15' },
      { id: 'tricep-pushdowns', name: 'Tricep Pushdowns', sets: 3, reps: '10-12' },
      { id: 'overhead-tricep', name: 'Overhead Tricep Extension', sets: 3, reps: '10-12' },
    ],
  },
  'pull-hypertrophy': {
    type: 'pull-hypertrophy',
    label: 'Pull Hypertrophy',
    color: 'text-purple-400',
    xp: 50,
    exercises: [
      { id: 'pull-ups', name: 'Pull-ups', sets: 4, reps: '8-10' },
      { id: 'barbell-rows', name: 'Barbell Rows', sets: 4, reps: '8-10' },
      { id: 'cable-rows', name: 'Seated Cable Rows', sets: 3, reps: '10-12' },
      { id: 'face-pulls', name: 'Face Pulls', sets: 3, reps: '15-20' },
      { id: 'barbell-curls', name: 'Barbell Curls', sets: 3, reps: '10-12' },
      { id: 'hammer-curls', name: 'Hammer Curls', sets: 3, reps: '10-12' },
      { id: 'rear-delt-flyes', name: 'Rear Delt Flyes', sets: 3, reps: '12-15' },
    ],
  },
  'legs-core': {
    type: 'legs-core',
    label: 'Legs & Core',
    color: 'text-red-400',
    xp: 50,
    exercises: [
      { id: 'squats', name: 'Barbell Squats', sets: 4, reps: '8-10' },
      { id: 'rdl', name: 'Romanian Deadlifts', sets: 4, reps: '10-12' },
      { id: 'leg-press', name: 'Leg Press', sets: 3, reps: '12-15' },
      { id: 'leg-curls', name: 'Leg Curls', sets: 3, reps: '12-15' },
      { id: 'calf-raises', name: 'Calf Raises', sets: 4, reps: '15-20' },
      { id: 'hanging-leg-raises', name: 'Hanging Leg Raises', sets: 3, reps: '12-15' },
      { id: 'planks', name: 'Planks', sets: 3, reps: '60s' },
    ],
  },
  'push-pull-power': {
    type: 'push-pull-power',
    label: 'Push/Pull Power',
    color: 'text-orange-400',
    xp: 60,
    exercises: [
      { id: 'deadlifts', name: 'Deadlifts', sets: 5, reps: '3-5' },
      { id: 'bench-heavy', name: 'Bench Press (Heavy)', sets: 5, reps: '3-5' },
      { id: 'weighted-pull-ups', name: 'Weighted Pull-ups', sets: 4, reps: '5-6' },
      { id: 'push-press', name: 'Push Press', sets: 4, reps: '5-6' },
      { id: 'barbell-rows-heavy', name: 'Barbell Rows (Heavy)', sets: 4, reps: '5-6' },
    ],
  },
  'peloton-pz-endurance': {
    type: 'peloton-pz-endurance',
    label: 'Peloton PZ Endurance',
    color: 'text-green-400',
    xp: 35,
    exercises: [
      { id: 'warmup', name: 'Zone 1-2 Warmup', sets: 1, reps: '10 min' },
      { id: 'pz-endurance', name: 'Zone 2-3 Endurance', sets: 1, reps: '30 min' },
      { id: 'cooldown', name: 'Zone 1 Cooldown', sets: 1, reps: '5 min' },
    ],
  },
  'peloton-pz-max': {
    type: 'peloton-pz-max',
    label: 'Peloton PZ Max',
    color: 'text-yellow-400',
    xp: 45,
    exercises: [
      { id: 'warmup', name: 'Zone 1-2 Warmup', sets: 1, reps: '10 min' },
      { id: 'intervals', name: 'Zone 5-6 Intervals', sets: 6, reps: '2 min on / 2 min off' },
      { id: 'pz-max', name: 'Zone 7 Max Effort', sets: 2, reps: '1 min' },
      { id: 'cooldown', name: 'Zone 1 Cooldown', sets: 1, reps: '5 min' },
    ],
  },
  'animal-flow': {
    type: 'animal-flow',
    label: 'Animal Flow',
    color: 'text-cyan-400',
    xp: 30,
    exercises: [
      { id: 'wrist-mobility', name: 'Wrist Mobility', sets: 1, reps: '5 min' },
      { id: 'beast-reach', name: 'Beast to Crab Reach', sets: 3, reps: '8 each side' },
      { id: 'scorpion', name: 'Scorpion Reach', sets: 3, reps: '6 each side' },
      { id: 'ape-reach', name: 'Ape to Frog', sets: 3, reps: '8 reps' },
      { id: 'flow-sequence', name: 'Flow Sequence', sets: 1, reps: '10 min' },
    ],
  },
  'rest': {
    type: 'rest',
    label: 'Rest Day',
    color: 'text-muted-foreground',
    xp: 10,
    exercises: [
      { id: 'stretching', name: 'Light Stretching', sets: 1, reps: '15 min' },
      { id: 'walk', name: 'Easy Walk', sets: 1, reps: '20 min' },
    ],
  },
};

export function getWorkoutForType(type: WorkoutType): Workout {
  const config = WORKOUT_CONFIGS[type];
  return {
    ...config,
    exercises: config.exercises.map(ex => ({ ...ex, completed: false })),
  };
}
