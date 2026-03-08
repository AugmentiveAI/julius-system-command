import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainingIntelligence {
  summary: string;
  insights: Array<{
    type: 'progression' | 'stagnation' | 'recovery' | 'imbalance' | 'optimization' | 'warning';
    title: string;
    detail: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  weeklyPlan: {
    focus: string;
    intensityGuidance: string;
    exerciseAdjustments: Array<{
      exercise: string;
      adjustment: string;
      reason: string;
    }>;
  };
  projections: {
    strengthTrajectory: string;
    volumeTrajectory: string;
    recoveryStatus: string;
  };
  todayGuidance: string;
  generatedAt: string;
  dataPoints: {
    totalSessions: number;
    totalVolume: number;
    avgFatigue: number;
    avgReadiness: number;
    exerciseCount: number;
  };
}

export interface TrainingContextForAI {
  totalSessions: number;
  totalVolume: number;
  avgFatigue: number;
  avgReadiness: number;
  fatigueAccumulation: number;
  mesocycleWeek: number;
  mesocycleLength: number;
  todayWorkoutType: string;
  prescribedIntensity: string | null;
  trainingLevel: string;
  sessionsLogged: number;
  recentPRs: Array<{ name: string; weight: number; reps: number }>;
  workoutDistribution: Record<string, number>;
}

const CACHE_KEY = 'systemTrainingIntelligence';

export function useTrainingIntelligence() {
  const { user } = useAuth();
  const [intelligence, setIntelligence] = useState<TrainingIntelligence | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as TrainingIntelligence;
      // Cache for 6 hours
      const age = Date.now() - new Date(data.generatedAt).getTime();
      if (age < 6 * 60 * 60 * 1000) return data;
      return null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (trainingContext: TrainingContextForAI, query?: string) => {
    if (!user || loading) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('training-intelligence', {
        body: { trainingContext, query },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data as TrainingIntelligence;
      setIntelligence(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      return result;
    } catch (e: any) {
      console.error('[TrainingIntelligence] Analysis failed:', e);
      setError(e.message || 'Training analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, loading]);

  return { intelligence, loading, error, analyze };
}

/**
 * Build training context object for injection into system-chat and system-intelligence.
 * Call from components that have access to useTrainingLog and useWorkout data.
 */
export function buildTrainingContext(opts: {
  recentLogs: Array<{ fatigue_score: number | null; readiness_pre: number | null; total_volume: number | null; workout_type: string; completed_at: string }>;
  personalRecords: Array<{ exerciseName: string; maxWeight: number; maxReps: number }>;
  fatigueAccumulation: number;
  mesocycleWeek: number;
  mesocycleLength: number;
  todayWorkoutType: string;
  prescribedIntensity: string | null;
  trainingLevel: string;
  sessionsLogged: number;
}): TrainingContextForAI {
  const { recentLogs, personalRecords, fatigueAccumulation } = opts;
  const totalSessions = recentLogs.length;
  const totalVolume = recentLogs.reduce((s, l) => s + (l.total_volume ?? 0), 0);
  const avgFatigue = totalSessions > 0
    ? Math.round(recentLogs.reduce((s, l) => s + (l.fatigue_score ?? 0), 0) / totalSessions)
    : 0;
  const readinessLogs = recentLogs.filter(l => l.readiness_pre != null);
  const avgReadiness = readinessLogs.length > 0
    ? Math.round(readinessLogs.reduce((s, l) => s + (l.readiness_pre ?? 0), 0) / readinessLogs.length)
    : 0;

  const workoutDistribution: Record<string, number> = {};
  for (const log of recentLogs) {
    workoutDistribution[log.workout_type] = (workoutDistribution[log.workout_type] || 0) + 1;
  }

  return {
    totalSessions,
    totalVolume,
    avgFatigue,
    avgReadiness,
    fatigueAccumulation,
    mesocycleWeek: opts.mesocycleWeek,
    mesocycleLength: opts.mesocycleLength,
    todayWorkoutType: opts.todayWorkoutType,
    prescribedIntensity: opts.prescribedIntensity,
    trainingLevel: opts.trainingLevel,
    sessionsLogged: opts.sessionsLogged,
    recentPRs: personalRecords.slice(0, 5).map(pr => ({
      name: pr.exerciseName,
      weight: pr.maxWeight,
      reps: pr.maxReps,
    })),
    workoutDistribution,
  };
}
