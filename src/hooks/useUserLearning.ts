import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserLearning,
  ExecutionPatterns,
  AvoidancePatterns,
  EnergyPatterns,
  StreakPatterns,
  GoalPatterns,
  ResponsePatterns,
  DerivedInsights,
} from '@/types/learning';
import { storageKey } from '@/utils/scopedStorage';

const STORAGE_KEY = 'jarvisUserLearning';
const COOLDOWN_MS = 3600000; // 1 hour
const DEBUG_TELEMETRY = import.meta.env.DEV;

function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function getDefaultResponses(): ResponsePatterns {
  return {
    messageReadRate: 0.5,
    messageActedOnRate: 0.3,
    effectiveMessageTypes: [],
    ignoredMessageTypes: [],
    preferredTone: 'direct',
  };
}

function calculateExecutionPatterns(questHistory: any[]): ExecutionPatterns {
  const byHour: Record<number, number> = {};
  const byDay: Record<string, number> = {};
  const byCategory: Record<string, { completed: number; total: number }> = {};

  for (const quest of questHistory) {
    if (quest.completedAt) {
      const date = new Date(quest.completedAt);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });

      byHour[hour] = (byHour[hour] || 0) + 1;
      byDay[day] = (byDay[day] || 0) + 1;

      const cat = quest.category || quest.type || 'uncategorized';
      byCategory[cat] = byCategory[cat] || { completed: 0, total: 0 };
      byCategory[cat].completed++;
    }
    if (quest.category || quest.type) {
      const cat = quest.category || quest.type;
      byCategory[cat] = byCategory[cat] || { completed: 0, total: 0 };
      byCategory[cat].total++;
    }
  }

  const peakHours = Object.entries(byHour)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([hour]) => parseInt(hour));

  const totalCompletions = questHistory.filter(q => q.completedAt).length;
  const avgPerDay = totalCompletions / Math.max(7, 1);
  const peakDays = Object.entries(byDay)
    .filter(([, count]) => count > avgPerDay)
    .map(([day]) => day);

  const completionRateByHour: Record<number, number> = {};
  const maxHourCount = Math.max(...Object.values(byHour), 1);
  for (const [hour, count] of Object.entries(byHour)) {
    completionRateByHour[parseInt(hour)] = count / maxHourCount;
  }

  const completionRateByCategory: Record<string, number> = {};
  for (const [cat, data] of Object.entries(byCategory)) {
    completionRateByCategory[cat] = data.total > 0 ? data.completed / data.total : 0;
  }

  const completedCount = questHistory.filter(q => q.completedAt).length;
  const uniqueDays = new Set(
    questHistory.filter(q => q.completedAt).map(q => new Date(q.completedAt).toDateString())
  );

  return {
    peakHours,
    peakDays,
    averageQuestsPerDay: uniqueDays.size > 0 ? completedCount / uniqueDays.size : 0,
    averageQuestsOnPeakDays: 0,
    averageQuestsOnOffDays: 0,
    completionRateByHour,
    completionRateByCategory,
    averageSprintDuration: 45,
    optimalSprintLength: 45,
  };
}

function calculateAvoidancePatterns(questHistory: any[]): AvoidancePatterns {
  const byCategory: Record<string, { completed: number; total: number }> = {};

  for (const quest of questHistory) {
    const cat = quest.category || quest.type || 'uncategorized';
    byCategory[cat] = byCategory[cat] || { completed: 0, total: 0 };
    byCategory[cat].total++;
    if (quest.completedAt) byCategory[cat].completed++;
  }

  const avoidedCategories = Object.entries(byCategory)
    .filter(([, data]) => data.total >= 3 && data.completed / data.total < 0.3)
    .map(([cat]) => cat);

  return {
    avoidedCategories,
    avoidanceHours: [],
    avoidanceTriggers: [],
    averageProcrastinationTime: 0,
  };
}

function calculateEnergyPatterns(questHistory: any[]): EnergyPatterns {
  const hourCounts: Record<number, number> = {};
  for (const quest of questHistory) {
    if (quest.completedAt) {
      const hour = new Date(quest.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }

  const maxCount = Math.max(...Object.values(hourCounts), 1);
  const energyByHour: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    energyByHour[h] = (hourCounts[h] || 0) / maxCount;
  }

  // Fix: parse each hour key as integer before filtering
  const crashHours = Object.entries(energyByHour)
    .filter(([hourStr, val]) => {
      const h = parseInt(hourStr, 10);
      return val < 0.15 && h >= 12 && h <= 18;
    })
    .map(([h]) => parseInt(h, 10));

  return {
    energyByHour,
    energyBySleepHours: {},
    energyBoostFromExercise: 1.2,
    crashHours,
    crashRecoveryTime: 30,
  };
}

function calculateStreakPatterns(player: any): StreakPatterns {
  return {
    averageStreakLength: player?.streak || 0,
    longestStreak: player?.streak || 0,
    streakBreakers: [],
    streakProtectors: ['morning_quest', 'state_scan'],
  };
}

function calculateGoalPatterns(): GoalPatterns {
  return {
    goalCompletionRate: 0.5,
    successfulGoalTypes: [],
    avgTimeToCompleteByType: {},
  };
}

function generateInsightsFromData(
  execution: ExecutionPatterns,
  avoidance: AvoidancePatterns,
  energy: EnergyPatterns,
): DerivedInsights {
  const strengths: string[] = [];
  const growthAreas: string[] = [];
  const recommendations: string[] = [];

  if (execution.peakHours.length > 0) {
    strengths.push(`Peak productivity at ${execution.peakHours.map(h => `${h}:00`).join(', ')}`);
  }
  if (execution.averageQuestsPerDay >= 3) {
    strengths.push(`Strong daily output: ~${execution.averageQuestsPerDay.toFixed(1)} quests/day`);
  }
  if (avoidance.avoidedCategories.length > 0) {
    growthAreas.push(`Tends to avoid: ${avoidance.avoidedCategories.join(', ')}`);
    recommendations.push(`Schedule ${avoidance.avoidedCategories[0]} tasks during peak hours`);
  }
  if (energy.crashHours.length > 0) {
    growthAreas.push(`Energy crashes at ${energy.crashHours.map(h => `${h}:00`).join(', ')}`);
    recommendations.push('Plan lighter tasks during crash windows');
  }

  return { strengths, growthAreas, recommendations };
}

export function useUserLearning() {
  const [learning, setLearning] = useState<UserLearning | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastAnalyzedAt = useRef<number>(0);

  // Load stored learning (scoped)
  useEffect(() => {
    try {
      const scopedKey = storageKey(STORAGE_KEY);
      if (DEBUG_TELEMETRY) console.debug("[telemetry]", { event: "scoped_key_used", op: "load_learning", key: scopedKey });
      const stored = localStorage.getItem(scopedKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLearning(parsed);
        if (parsed.lastUpdated) {
          lastAnalyzedAt.current = new Date(parsed.lastUpdated).getTime();
        }
      }
    } catch { /* ignore */ }
  }, []);

  const analyzePatterns = useCallback(async () => {
    // Cooldown: skip if analyzed less than 1 hour ago
    if (Date.now() - lastAnalyzedAt.current < COOLDOWN_MS) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const calibratedCompletions = JSON.parse(
        localStorage.getItem(storageKey('systemCalibratedCompletions')) || '[]'
      );
      const historyRaw = JSON.parse(
        localStorage.getItem(storageKey('the-system-history')) || '{"completions":[]}'
      );
      const questHistory = [...calibratedCompletions, ...(historyRaw.completions || [])];

      // Try scoped 'the-system-player' first, then fallback to 'systemPlayer'
      const playerRaw =
        localStorage.getItem(storageKey('the-system-player')) ||
        localStorage.getItem(storageKey('systemPlayer'));
      const player = playerRaw ? JSON.parse(playerRaw) : {};

      const execution = calculateExecutionPatterns(questHistory);
      const avoidance = calculateAvoidancePatterns(questHistory);
      const energy = calculateEnergyPatterns(questHistory);
      const streaks = calculateStreakPatterns(player);
      const goals = calculateGoalPatterns();
      const insights = generateInsightsFromData(execution, avoidance, energy);

      const newLearning: UserLearning = {
        userId: 'current',
        lastUpdated: new Date().toISOString(),
        execution,
        avoidance,
        energy,
        streaks,
        goals,
        responses: learning?.responses || getDefaultResponses(),
        insights,
      };

      lastAnalyzedAt.current = Date.now();
      setLearning(newLearning);
      localStorage.setItem(storageKey(STORAGE_KEY), JSON.stringify(newLearning));
    } catch (e) {
      console.error('[UserLearning] Analysis failed:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [learning?.responses]);

  // Auto-analyze: once on load if data is stale (>1 day)
  useEffect(() => {
    const lastAnalysis = learning?.lastUpdated;
    const shouldAnalyze = !lastAnalysis || daysBetween(new Date(lastAnalysis), new Date()) >= 1;
    if (shouldAnalyze && !isAnalyzing) {
      analyzePatterns();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPrediction = useCallback((type: 'energy' | 'productivity' | 'focus'): number => {
    if (!learning) return 0.5;
    const hour = new Date().getHours();
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    switch (type) {
      case 'energy':
        return learning.energy.energyByHour[hour] ?? 0.5;
      case 'productivity': {
        const isPeakDay = learning.execution.peakDays.includes(day);
        const isPeakHour = learning.execution.peakHours.includes(hour);
        return isPeakDay && isPeakHour ? 0.9 : isPeakHour ? 0.7 : 0.4;
      }
      case 'focus': {
        const isCrashHour = learning.energy.crashHours.includes(hour);
        return isCrashHour ? 0.3 : 0.7;
      }
      default:
        return 0.5;
    }
  }, [learning]);

  const isGoodTimeFor = useCallback((category: string): boolean => {
    if (!learning) return true;
    const hour = new Date().getHours();
    const isPeakHour = learning.execution.peakHours.includes(hour);
    const isAvoidedCategory = learning.avoidance.avoidedCategories.includes(category);
    const completionRate = learning.execution.completionRateByCategory[category] ?? 0.5;
    return isPeakHour && (!isAvoidedCategory || completionRate > 0.6);
  }, [learning]);

  return {
    learning,
    isAnalyzing,
    analyzePatterns,
    getPrediction,
    isGoodTimeFor,
    getInsights: () => learning?.insights || null,
  };
}
