import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ────────────────────────────────────────────────────────────

export interface ExerciseLog {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  rpe: number;
  completed: boolean;
}

export interface TrainingLogEntry {
  id: string;
  user_id: string;
  workout_type: string;
  exercises: ExerciseLog[];
  total_volume: number;
  fatigue_score: number | null;
  readiness_pre: number | null;
  genetic_phase: string | null;
  sprint_count: number;
  completed_at: string;
  notes: string | null;
  created_at: string;
}

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  maxVolume: number; // best single-session volume for this exercise
  achievedAt: string;
}

export interface LogWorkoutInput {
  workout_type: string;
  exercises: ExerciseLog[];
  fatigue_score: number | null;
  readiness_pre: number | null;
  genetic_phase: string | null;
  sprint_count: number;
  notes: string | null;
}

// ── Local Storage Cache Keys ─────────────────────────────────────────

const CACHE_KEYS = {
  recentLogs: 'the-system-training-log',
  prs: 'the-system-exercise-prs',
  fatigue: 'the-system-fatigue-accumulation',
};

function cacheSet(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useTrainingLog() {
  const { user } = useAuth();
  const [recentLogs, setRecentLogs] = useState<TrainingLogEntry[]>(
    () => cacheGet<TrainingLogEntry[]>(CACHE_KEYS.recentLogs) ?? []
  );
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>(
    () => cacheGet<PersonalRecord[]>(CACHE_KEYS.prs) ?? []
  );
  const [fatigueAccumulation, setFatigueAccumulation] = useState<number>(
    () => cacheGet<number>(CACHE_KEYS.fatigue) ?? 0
  );
  const [loading, setLoading] = useState(false);

  // ── Fetch recent workouts (last N days) ─────────────────────────

  const fetchRecentWorkouts = useCallback(async (days = 14) => {
    if (!user) return;
    setLoading(true);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('training_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', since)
      .order('completed_at', { ascending: false });

    if (!error && data) {
      const entries = data.map(row => ({
        ...row,
        exercises: (row.exercises as unknown as ExerciseLog[]) ?? [],
      })) as TrainingLogEntry[];

      setRecentLogs(entries);
      cacheSet(CACHE_KEYS.recentLogs, entries);

      // Recalculate fatigue (rolling 7-day)
      const sevenDayAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const fatigue = entries
        .filter(e => new Date(e.completed_at).getTime() > sevenDayAgo)
        .reduce((sum, e) => sum + (e.fatigue_score ?? 0), 0);
      setFatigueAccumulation(fatigue);
      cacheSet(CACHE_KEYS.fatigue, fatigue);

      // Recalculate PRs
      const prMap = new Map<string, PersonalRecord>();
      for (const entry of entries) {
        for (const ex of entry.exercises) {
          if (!ex.completed || !ex.weight) continue;
          const existing = prMap.get(ex.name);
          const volume = ex.sets * ex.reps * ex.weight;
          if (!existing) {
            prMap.set(ex.name, {
              exerciseName: ex.name,
              maxWeight: ex.weight,
              maxReps: ex.reps,
              maxVolume: volume,
              achievedAt: entry.completed_at,
            });
          } else {
            if (ex.weight > existing.maxWeight) {
              existing.maxWeight = ex.weight;
              existing.achievedAt = entry.completed_at;
            }
            if (volume > existing.maxVolume) {
              existing.maxVolume = volume;
            }
            if (ex.reps > existing.maxReps) {
              existing.maxReps = ex.reps;
            }
          }
        }
      }
      const prs = Array.from(prMap.values());
      setPersonalRecords(prs);
      cacheSet(CACHE_KEYS.prs, prs);
    }
    setLoading(false);
  }, [user]);

  // ── Initial fetch ───────────────────────────────────────────────

  useEffect(() => {
    fetchRecentWorkouts();
  }, [fetchRecentWorkouts]);

  // ── Log a completed workout ─────────────────────────────────────

  const logWorkout = useCallback(async (input: LogWorkoutInput): Promise<TrainingLogEntry | null> => {
    if (!user) return null;

    const totalVolume = input.exercises
      .filter(e => e.completed)
      .reduce((sum, e) => sum + (e.sets * e.reps * e.weight), 0);

    const { data, error } = await supabase
      .from('training_log')
      .insert({
        user_id: user.id,
        workout_type: input.workout_type,
        exercises: input.exercises as unknown as Record<string, unknown>[],
        total_volume: totalVolume,
        fatigue_score: input.fatigue_score,
        readiness_pre: input.readiness_pre,
        genetic_phase: input.genetic_phase,
        sprint_count: input.sprint_count,
        notes: input.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log workout:', error);
      return null;
    }

    if (data) {
      const entry = {
        ...data,
        exercises: (data.exercises as unknown as ExerciseLog[]) ?? [],
      } as TrainingLogEntry;

      // Update local state
      setRecentLogs(prev => {
        const updated = [entry, ...prev];
        cacheSet(CACHE_KEYS.recentLogs, updated);
        return updated;
      });

      // Refresh fatigue + PRs
      await fetchRecentWorkouts();
      return entry;
    }
    return null;
  }, [user, fetchRecentWorkouts]);

  // ── Volume progression for a specific exercise ──────────────────

  const getVolumeProgression = useCallback((exerciseName: string) => {
    return recentLogs
      .flatMap(log =>
        log.exercises
          .filter(e => e.name === exerciseName && e.completed)
          .map(e => ({
            date: log.completed_at,
            volume: e.sets * e.reps * e.weight,
            weight: e.weight,
            reps: e.reps,
            sets: e.sets,
            rpe: e.rpe,
          }))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [recentLogs]);

  // ── Get the last logged session for a specific exercise ─────────

  const getLastSession = useCallback((exerciseName: string) => {
    for (const log of recentLogs) {
      const match = log.exercises.find(e => e.name === exerciseName && e.completed);
      if (match) {
        return { ...match, date: log.completed_at };
      }
    }
    return null;
  }, [recentLogs]);

  // ── Get PR for a specific exercise ──────────────────────────────

  const getPR = useCallback((exerciseName: string): PersonalRecord | null => {
    return personalRecords.find(pr => pr.exerciseName === exerciseName) ?? null;
  }, [personalRecords]);

  return {
    recentLogs,
    personalRecords,
    fatigueAccumulation,
    loading,
    logWorkout,
    getVolumeProgression,
    getLastSession,
    getPR,
    fetchRecentWorkouts,
  };
}
