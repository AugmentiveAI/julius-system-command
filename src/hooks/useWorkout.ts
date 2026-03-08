import { useState, useEffect, useCallback } from 'react';
import { Workout, WorkoutType, WEEKLY_SCHEDULE } from '@/types/training';
import { getWorkoutForType } from '@/data/workouts';
import { getSystemDate, getSystemDayOfWeek } from '@/utils/dayCycleEngine';
import { logWorkoutRecovery } from '@/utils/muscleRecovery';
import { prescribeTraining, TrainingPrescription, scaleExercises } from '@/utils/trainingPrescription';
import { getGeneticState } from '@/utils/geneticEngine';
import { evaluateWorkoutSwap, SwapDecision } from '@/utils/workoutSwap';
import {
  getOverloadState,
  getWorkoutOverloadPlan,
  logExerciseCompletion,
  incrementSessionCount,
} from '@/utils/overloadEngine';
import { OverloadPrescription } from '@/types/overload';

interface WorkoutState {
  workout: Workout;
  lastResetDate: string;
  workoutCompleted: boolean;
  prescribedIntensity?: 'heavy' | 'moderate' | 'light';
}

const WORKOUT_STORAGE_KEY = 'the-system-workout';
const STATE_HISTORY_KEY = 'systemStateHistory';
const GENETIC_HUD_KEY = 'systemGeneticHUD';

function getTodayDateString(): string {
  return getSystemDate();
}

function getTodayWorkoutType(): WorkoutType {
  const dayOfWeek = getSystemDayOfWeek();
  return WEEKLY_SCHEDULE[dayOfWeek];
}

function loadLatestStateCheck() {
  try {
    const stored = localStorage.getItem(STATE_HISTORY_KEY);
    if (stored) {
      const checks = JSON.parse(stored);
      return checks.length > 0 ? checks[checks.length - 1] : null;
    }
  } catch { /* ignore */ }
  return null;
}

function loadGeneticHUD() {
  try {
    const stored = localStorage.getItem(GENETIC_HUD_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { lastColdExposure: null, lastMagnesium: null, sprintsToday: 0, stressLevel: 2 };
}

function loadWorkoutState(): WorkoutState {
  const today = getTodayDateString();

  // Evaluate swap before deciding workout type
  const swap = evaluateWorkoutSwap();
  const effectiveType = swap.finalType;

  try {
    const stored = localStorage.getItem(WORKOUT_STORAGE_KEY);
    if (stored) {
      const state: WorkoutState = JSON.parse(stored);
      // Reset if it's a new day
      if (state.lastResetDate !== today) {
        return {
          workout: getWorkoutForType(effectiveType),
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
    workout: getWorkoutForType(effectiveType),
    lastResetDate: today,
    workoutCompleted: false,
  };
}

export function useWorkout() {
  const [state, setState] = useState<WorkoutState>(loadWorkoutState);
  const [prescription, setPrescription] = useState<TrainingPrescription | null>(null);
  const [swapDecision, setSwapDecision] = useState<SwapDecision | null>(null);
  const [overloadPlan, setOverloadPlan] = useState<OverloadPrescription[]>([]);
  const overloadState = getOverloadState();

  // Compute prescription and swap on mount
  useEffect(() => {
    const now = new Date();
    const hudData = loadGeneticHUD();
    const geneticState = getGeneticState(
      now,
      hudData.lastColdExposure ? new Date(hudData.lastColdExposure) : null,
      hudData.lastMagnesium ? new Date(hudData.lastMagnesium) : null,
      hudData.sprintsToday,
      hudData.stressLevel,
    );
    const latestState = loadLatestStateCheck();

    // Evaluate swap
    const swap = evaluateWorkoutSwap(now);
    setSwapDecision(swap);
    const workoutType = swap.finalType;

    const result = prescribeTraining(workoutType, geneticState, latestState, now);
    setPrescription(result);

    // If no intensity stored yet (fresh day), scale exercises
    if (!state.prescribedIntensity && !state.workoutCompleted) {
      const baseWorkout = getWorkoutForType(workoutType);
      const scaled = scaleExercises(baseWorkout.exercises, result.prescribedIntensity);
      setState(prev => ({
        ...prev,
        prescribedIntensity: result.prescribedIntensity,
        workout: {
          ...prev.workout,
          xp: Math.round(prev.workout.xp * result.xpMultiplier),
          exercises: scaled.map(se => ({
            id: se.id,
            name: se.name,
            sets: se.sets,
            reps: se.reps,
            completed: false,
            muscleGroups: baseWorkout.exercises.find(e => e.id === se.id)?.muscleGroups,
          })),
        },
      }));
    }

    // Compute overload plan
    const plan = getWorkoutOverloadPlan(
      getWorkoutForType(workoutType).exercises.map(e => ({
        id: e.id, name: e.name, sets: e.sets, reps: e.reps,
      })),
    );
    setOverloadPlan(plan);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Check for daily reset
  useEffect(() => {
    const today = getTodayDateString();
    if (state.lastResetDate !== today) {
      const swap = evaluateWorkoutSwap();
      setState({
        workout: getWorkoutForType(swap.finalType),
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
    setState(prev => {
      // Log muscle recovery data
      const intensity = prev.prescribedIntensity || 'moderate';
      logWorkoutRecovery(
        prev.workout.type,
        intensity,
        prev.workout.exercises.map(ex => ({
          sets: ex.sets,
          muscleGroups: ex.muscleGroups,
        })),
      );

      // Log each exercise for progressive overload tracking
      for (const ex of prev.workout.exercises) {
        if (ex.completed) {
          logExerciseCompletion(ex.id, ex.name, ex.sets, ex.reps);
        }
      }
      incrementSessionCount();

      return {
        ...prev,
        workoutCompleted: true,
      };
    });
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
    prescription,
    swapDecision,
    overloadPlan,
    trainingLevel: overloadState.detectedLevel,
    sessionsLogged: overloadState.sessionsLogged,
    resetWorkout: useCallback(() => {
      const swap = evaluateWorkoutSwap();
      setState({
        workout: getWorkoutForType(swap.finalType),
        lastResetDate: getTodayDateString(),
        workoutCompleted: false,
      });
    }, []),
  };
}
