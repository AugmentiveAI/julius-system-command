import { Workout, WorkoutType, Exercise, MuscleGroup } from '@/types/training';

const createExercise = (id: string, name: string, sets: number, reps: string): Exercise => ({
  id,
  name,
  sets,
  reps,
  completed: false,
});

interface ExerciseConfig {
  id: string;
  name: string;
  sets: number;
  reps: string;
  muscleGroups?: MuscleGroup[];
}

export const WORKOUT_CONFIGS: Record<WorkoutType, Omit<Workout, 'exercises'> & { exercises: Omit<Exercise, 'completed'>[] }> = {
  'push-hypertrophy': {
    type: 'push-hypertrophy',
    label: 'Push Hypertrophy',
    color: 'text-red-400',
    xp: 200,
    exercises: [
      { id: 'incline-db-press', name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { id: 'flat-db-press', name: 'Flat Dumbbell Press', sets: 3, reps: '10-12', muscleGroups: ['chest', 'triceps'] },
      { id: 'cable-fly', name: 'Cable Fly (Low-to-High)', sets: 3, reps: '12-15', muscleGroups: ['chest'] },
      { id: 'seated-db-shoulder', name: 'Seated DB Shoulder Press', sets: 4, reps: '8-10', muscleGroups: ['shoulders', 'triceps'] },
      { id: 'lateral-raises', name: 'Lateral Raises', sets: 3, reps: '12-15', muscleGroups: ['shoulders'] },
      { id: 'rope-tricep', name: 'Rope Tricep Pushdown', sets: 3, reps: '12-15', muscleGroups: ['triceps'] },
      { id: 'overhead-tricep', name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', muscleGroups: ['triceps'] },
    ],
  },
  'pull-hypertrophy': {
    type: 'pull-hypertrophy',
    label: 'Pull Hypertrophy',
    color: 'text-blue-400',
    xp: 200,
    exercises: [
      { id: 'pullups', name: 'Pull-ups or Lat Pulldown', sets: 4, reps: '8-10', muscleGroups: ['back', 'biceps'] },
      { id: 'seated-cable-row', name: 'Seated Cable Row', sets: 4, reps: '10-12', muscleGroups: ['back'] },
      { id: 'single-arm-row', name: 'Single-Arm DB Row', sets: 3, reps: '10-12 each', muscleGroups: ['back'] },
      { id: 'face-pulls', name: 'Face Pulls', sets: 3, reps: '15-20', muscleGroups: ['shoulders', 'back'] },
      { id: 'barbell-curl', name: 'Barbell Curl', sets: 3, reps: '10-12', muscleGroups: ['biceps'] },
      { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', sets: 3, reps: '10-12', muscleGroups: ['biceps'] },
      { id: 'hammer-curls', name: 'Hammer Curls', sets: 2, reps: '12-15', muscleGroups: ['biceps'] },
    ],
  },
  'legs-core': {
    type: 'legs-core',
    label: 'Legs + Core',
    color: 'text-green-400',
    xp: 200,
    exercises: [
      { id: 'leg-press', name: 'Leg Press', sets: 4, reps: '8-12', muscleGroups: ['legs'] },
      { id: 'hack-squat', name: 'Hack Squat or Goblet Squat', sets: 3, reps: '10-12', muscleGroups: ['legs'] },
      { id: 'walking-lunges', name: 'Walking Lunges', sets: 3, reps: '10-12 each', muscleGroups: ['legs'] },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 4, reps: '8-10', muscleGroups: ['legs', 'back'] },
      { id: 'lying-leg-curl', name: 'Lying Leg Curl', sets: 3, reps: '10-12', muscleGroups: ['legs'] },
      { id: 'hip-thrust', name: 'Hip Thrust', sets: 3, reps: '10-12', muscleGroups: ['legs'] },
      { id: 'calf-raises', name: 'Standing Calf Raise', sets: 4, reps: '12-15', muscleGroups: ['legs'] },
      { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', sets: 3, reps: '10-15', muscleGroups: ['core'] },
      { id: 'cable-woodchop', name: 'Cable Woodchop', sets: 3, reps: '10-12 each', muscleGroups: ['core'] },
    ],
  },
  'push-pull-power': {
    type: 'push-pull-power',
    label: 'Push/Pull Power',
    color: 'text-purple-400',
    xp: 250,
    exercises: [
      { id: 'med-ball-pass', name: 'Medicine Ball Chest Pass', sets: 3, reps: '8', muscleGroups: ['chest'] },
      { id: 'barbell-bench', name: 'Barbell Bench Press', sets: 4, reps: '5-6', muscleGroups: ['chest', 'triceps'] },
      { id: 'standing-ohp', name: 'Standing Overhead Press', sets: 4, reps: '5-6', muscleGroups: ['shoulders', 'triceps'] },
      { id: 'weighted-pullups', name: 'Weighted Pull-ups', sets: 4, reps: '5-6', muscleGroups: ['back', 'biceps'] },
      { id: 'pendlay-row', name: 'Pendlay Row', sets: 4, reps: '5-6', muscleGroups: ['back'] },
      { id: 'weighted-dips', name: 'Dips (Weighted)', sets: 3, reps: '8-10', muscleGroups: ['chest', 'triceps'] },
    ],
  },
  'peloton-pz-endurance': {
    type: 'peloton-pz-endurance',
    label: 'Peloton PZ Endurance',
    color: 'text-orange-400',
    xp: 150,
    exercises: [
      { id: 'pz-endurance', name: 'Matt Wilpers 45-min PZ Endurance', sets: 1, reps: '45 min', muscleGroups: ['cardio', 'legs'] },
      { id: 'post-ride-stretch', name: 'Post-ride stretch', sets: 1, reps: '10 min', muscleGroups: ['mobility'] },
    ],
  },
  'peloton-pz-max': {
    type: 'peloton-pz-max',
    label: 'Peloton PZ Max',
    color: 'text-yellow-400',
    xp: 200,
    exercises: [
      { id: 'pz-max', name: 'Matt Wilpers 45-60 min PZ Max', sets: 1, reps: '45-60 min', muscleGroups: ['cardio', 'legs'] },
      { id: 'post-ride-foam', name: 'Post-ride stretch + foam roll', sets: 1, reps: '15 min', muscleGroups: ['mobility'] },
    ],
  },
  'animal-flow': {
    type: 'animal-flow',
    label: 'Animal Flow',
    color: 'text-cyan-400',
    xp: 100,
    exercises: [
      { id: 'wrist-prep', name: 'Wrist Prep', sets: 1, reps: '3 min', muscleGroups: ['mobility'] },
      { id: 'activations', name: 'Activations (Beast, Crab)', sets: 1, reps: '5 min', muscleGroups: ['core', 'mobility'] },
      { id: 'form-stretches', name: 'Form Specific Stretches', sets: 1, reps: '5 min', muscleGroups: ['mobility'] },
      { id: 'traveling-forms', name: 'Traveling Forms', sets: 1, reps: '10-15 min', muscleGroups: ['mobility', 'core'] },
      { id: 'switches', name: 'Switches & Transitions', sets: 1, reps: '5-10 min', muscleGroups: ['mobility', 'core'] },
      { id: 'flow-sequences', name: 'Flow Sequences', sets: 1, reps: '5-10 min', muscleGroups: ['mobility', 'core'] },
    ],
  },
  'rest': {
    type: 'rest',
    label: 'Rest Day',
    color: 'text-muted-foreground',
    xp: 10,
    exercises: [
      { id: 'stretching', name: 'Light Stretching', sets: 1, reps: '15 min', muscleGroups: ['mobility'] },
      { id: 'walk', name: 'Easy Walk', sets: 1, reps: '20 min', muscleGroups: ['cardio'] },
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
