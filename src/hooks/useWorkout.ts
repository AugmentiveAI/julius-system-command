import { useState, useEffect, useCallback } from 'react';
import { Workout, WorkoutType, WEEKLY_SCHEDULE } from '@/types/training';
import { getWorkoutForType } from '@/data/workouts';

interface WorkoutState {
  workout: Workout;
  lastResetDate: string;
  workoutCompleted: boolean;
}

const WORKOUT_STORAGE_KEY = 'the-system-workout';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getTodayWorkoutType(): WorkoutType {
  const dayOfWeek = new Date().getDay();
  return WEEKLY_SCHEDULE[dayOfWeek];
}

function loadWorkoutState(): WorkoutState {
  const today = getTodayDateString();
  const todayType = getTodayWorkoutType();

  try {
    const stored = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (stored) {
      const state: WorkoutState = JSON.parse(stored);
      // Reset if it's a new day
      if (state.lastResetDate !== today) {
        return {
          workout: getWorkoutForType(todayType),
          lastResetDate: today,
          workoutCompleted: false,
        };
      }
      return state;
    }
  } catch (e) {
    console.error('Failed to load workout data:', e);
  }

  return {
    workout: getWorkoutForType(todayType),
    lastResetDate: today,
    workoutCompleted: false,
  };
}

export function useWorkout() {
  const [state, setState] = useState<WorkoutState>(loadWorkoutState);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for daily reset
  useEffect(() => {
    const today = getTodayDateString();
    if (state.lastResetDate !== today) {
      const todayType = getTodayWorkoutType();
      setState({
        workout: getWorkoutForType(todayType),
        lastResetDate: today,
        workoutCompleted: false,
      });
    }
  }, [state.lastResetDate]);

  const toggleExercise = useCallback((exerciseId: string) => {
    setState(prev => ({
      ...prev,
      workout: {
        ...prev.workout,
        exercises: prev.workout.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
        ),
      },
    }));
  }, []);

  const completeWorkout = useCallback(() => {
    setState(prev => ({
      ...prev,
      workoutCompleted: true,
    }));
  }, []);

  const completedCount = state.workout.exercises.filter(ex => ex.completed).length;
  const totalCount = state.workout.exercises.length;
  const allExercisesComplete = completedCount === totalCount;

  return {
    workout: state.workout,
    workoutCompleted: state.workoutCompleted,
    toggleExercise,
    completeWorkout,
    completedCount,
    totalCount,
    allExercisesComplete,
    todayWorkoutType: getTodayWorkoutType(),
  };
}
