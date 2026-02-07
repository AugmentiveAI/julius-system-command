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
    color: 'text-red-400',
    xp: 200,
    exercises: [
      { id: 'incline-db-press', name: 'Incline Dumbbell Press', sets: 4, reps: '8-10' },
      { id: 'flat-db-press', name: 'Flat Dumbbell Press', sets: 3, reps: '10-12' },
      { id: 'cable-fly', name: 'Cable Fly (Low-to-High)', sets: 3, reps: '12-15' },
      { id: 'seated-db-shoulder', name: 'Seated DB Shoulder Press', sets: 4, reps: '8-10' },
      { id: 'lateral-raises', name: 'Lateral Raises', sets: 3, reps: '12-15' },
      { id: 'rope-tricep', name: 'Rope Tricep Pushdown', sets: 3, reps: '12-15' },
      { id: 'overhead-tricep', name: 'Overhead Tricep Extension', sets: 3, reps: '10-12' },
    ],
  },
  'pull-hypertrophy': {
    type: 'pull-hypertrophy',
    label: 'Pull Hypertrophy',
    color: 'text-blue-400',
    xp: 200,
    exercises: [
      { id: 'pullups', name: 'Pull-ups or Lat Pulldown', sets: 4, reps: '8-10' },
      { id: 'seated-cable-row', name: 'Seated Cable Row', sets: 4, reps: '10-12' },
      { id: 'single-arm-row', name: 'Single-Arm DB Row', sets: 3, reps: '10-12 each' },
      { id: 'face-pulls', name: 'Face Pulls', sets: 3, reps: '15-20' },
      { id: 'barbell-curl', name: 'Barbell Curl', sets: 3, reps: '10-12' },
      { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', sets: 3, reps: '10-12' },
      { id: 'hammer-curls', name: 'Hammer Curls', sets: 2, reps: '12-15' },
    ],
  },
  'legs-core': {
    type: 'legs-core',
    label: 'Legs + Core',
    color: 'text-green-400',
    xp: 200,
    exercises: [
      { id: 'leg-press', name: 'Leg Press', sets: 4, reps: '8-12' },
      { id: 'hack-squat', name: 'Hack Squat or Goblet Squat', sets: 3, reps: '10-12' },
      { id: 'walking-lunges', name: 'Walking Lunges', sets: 3, reps: '10-12 each' },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 4, reps: '8-10' },
      { id: 'lying-leg-curl', name: 'Lying Leg Curl', sets: 3, reps: '10-12' },
      { id: 'hip-thrust', name: 'Hip Thrust', sets: 3, reps: '10-12' },
      { id: 'calf-raises', name: 'Standing Calf Raise', sets: 4, reps: '12-15' },
      { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', sets: 3, reps: '10-15' },
      { id: 'cable-woodchop', name: 'Cable Woodchop', sets: 3, reps: '10-12 each' },
    ],
  },
  'push-pull-power': {
    type: 'push-pull-power',
    label: 'Push/Pull Power',
    color: 'text-purple-400',
    xp: 250,
    exercises: [
      { id: 'med-ball-pass', name: 'Medicine Ball Chest Pass', sets: 3, reps: '8' },
      { id: 'barbell-bench', name: 'Barbell Bench Press', sets: 4, reps: '5-6' },
      { id: 'standing-ohp', name: 'Standing Overhead Press', sets: 4, reps: '5-6' },
      { id: 'weighted-pullups', name: 'Weighted Pull-ups', sets: 4, reps: '5-6' },
      { id: 'pendlay-row', name: 'Pendlay Row', sets: 4, reps: '5-6' },
      { id: 'weighted-dips', name: 'Dips (Weighted)', sets: 3, reps: '8-10' },
    ],
  },
  'peloton-pz-endurance': {
    type: 'peloton-pz-endurance',
    label: 'Peloton PZ Endurance',
    color: 'text-orange-400',
    xp: 150,
    exercises: [
      { id: 'pz-endurance', name: 'Matt Wilpers 45-min PZ Endurance', sets: 1, reps: '45 min' },
      { id: 'post-ride-stretch', name: 'Post-ride stretch', sets: 1, reps: '10 min' },
    ],
  },
  'peloton-pz-max': {
    type: 'peloton-pz-max',
    label: 'Peloton PZ Max',
    color: 'text-yellow-400',
    xp: 200,
    exercises: [
      { id: 'pz-max', name: 'Matt Wilpers 45-60 min PZ Max', sets: 1, reps: '45-60 min' },
      { id: 'post-ride-foam', name: 'Post-ride stretch + foam roll', sets: 1, reps: '15 min' },
    ],
  },
  'animal-flow': {
    type: 'animal-flow',
    label: 'Animal Flow',
    color: 'text-cyan-400',
    xp: 100,
    exercises: [
      { id: 'wrist-prep', name: 'Wrist Prep', sets: 1, reps: '3 min' },
      { id: 'activations', name: 'Activations (Beast, Crab)', sets: 1, reps: '5 min' },
      { id: 'form-stretches', name: 'Form Specific Stretches', sets: 1, reps: '5 min' },
      { id: 'traveling-forms', name: 'Traveling Forms', sets: 1, reps: '10-15 min' },
      { id: 'switches', name: 'Switches & Transitions', sets: 1, reps: '5-10 min' },
      { id: 'flow-sequences', name: 'Flow Sequences', sets: 1, reps: '5-10 min' },
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
