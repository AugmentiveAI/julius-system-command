import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DailyAAR, WeeklyAAR, calculateDayGrade, DayGrade } from '@/types/afterActionReview';
import { useHistoryContext } from '@/contexts/HistoryContext';
import { usePlayer } from '@/hooks/usePlayer';
import { getSystemDate } from '@/utils/dayCycleEngine';

const AAR_HISTORY_KEY = 'systemAARHistory';
const WEEKLY_AAR_KEY = 'systemWeeklyAAR';

function loadAARHistory(): DailyAAR[] {
  try {
    return JSON.parse(localStorage.getItem(AAR_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function loadWeeklyAAR(): WeeklyAAR | null {
  try {
    const raw = localStorage.getItem(WEEKLY_AAR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function generateId(): string {
  return `aar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useAfterActionReview() {
  const [aarHistory, setAARHistory] = useState<DailyAAR[]>(loadAARHistory);
  const [weeklyAAR, setWeeklyAAR] = useState<WeeklyAAR | null>(loadWeeklyAAR);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const { daysSummary, weeklySummary } = useHistoryContext();
  const { player } = usePlayer();

  const todayAAR = aarHistory.find(a => a.date === getSystemDate()) || null;

  // Gather daily metrics from local data
  const gatherDailyMetrics = useCallback(() => {
    const today = getSystemDate();
    const todayEntries = daysSummary.find(d => d.date === today);
    const questsCompleted = todayEntries?.entries.length || 0;
    const xpEarned = todayEntries?.totalXP || 0;

    // Calculate averages from history
    const last7 = aarHistory.slice(-7);
    const avgXP = last7.length > 0
      ? last7.reduce((s, a) => s + a.xpEarned, 0) / last7.length
      : xpEarned;

    // Peak window: count completions between 8-12
    const peakCompletions = todayEntries?.entries.filter(e => {
      const h = new Date(e.completedAt).getHours();
      return h >= 8 && h < 12;
    }).length || 0;
    const peakUtilization = questsCompleted > 0
      ? Math.round((peakCompletions / Math.max(questsCompleted, 1)) * 100)
      : 0;

    // Crash window violations: completions during 14-17 (cognitive dip)
    const crashViolations = todayEntries?.entries.filter(e => {
      const h = new Date(e.completedAt).getHours();
      return h >= 14 && h < 17;
    }).length || 0;

    const questsPlanned = 8; // approximation
    const completionRate = questsCompleted / Math.max(questsPlanned, 1);

    const grade = calculateDayGrade({
      completionRate,
      peakWindowUtilization: peakUtilization,
      xpVsDailyAverage: avgXP > 0 ? ((xpEarned - avgXP) / avgXP) * 100 : 0,
      crashWindowViolations: crashViolations,
    });

    return {
      questsPlanned,
      questsCompleted,
      completionRate: Math.round(completionRate * 100),
      xpEarned,
      xpVsDailyAverage: avgXP > 0 ? Math.round(((xpEarned - avgXP) / avgXP) * 100) : 0,
      peakWindowUtilization: peakUtilization,
      crashWindowViolations: crashViolations,
      totalFocusMinutes: questsCompleted * 25, // estimate
      sprintsCompleted: questsCompleted,
      dayGrade: grade,
    };
  }, [daysSummary, aarHistory]);

  const generateDailyAAR = useCallback(async () => {
    const today = getSystemDate();
    if (aarHistory.find(a => a.date === today)) return;

    setIsGenerating(true);

    const metrics = gatherDailyMetrics();

    try {
      const { data, error } = await supabase.functions.invoke('generate-aar', {
        body: {
          type: 'daily',
          metrics,
          playerData: {
            level: player.level,
            stats: player.stats,
            streak: player.streak,
            goal: player.goal,
          },
        },
      });

      const aar: DailyAAR = {
        id: generateId(),
        date: today,
        ...metrics,
        resistancePatterns: data?.resistancePatterns || [],
        momentumPeriods: data?.momentumPeriods || [],
        statChanges: data?.statChanges || {},
        winOfTheDay: data?.winOfTheDay || `Completed ${metrics.questsCompleted} quests.`,
        missOfTheDay: data?.missOfTheDay || (metrics.peakWindowUtilization < 50 ? 'Low peak window utilization.' : 'No significant misses.'),
        patternObserved: data?.patternObserved || null,
        tomorrowPriority: data?.tomorrowPriority || 'Maintain consistency.',
        generatedAt: new Date().toISOString(),
      };

      const updated = [...aarHistory, aar];
      setAARHistory(updated);
      localStorage.setItem(AAR_HISTORY_KEY, JSON.stringify(updated.slice(-30)));
      setShowDailyModal(true);
    } catch (e) {
      console.error('AAR generation failed:', e);
      // Generate locally without AI
      const aar: DailyAAR = {
        id: generateId(),
        date: today,
        ...metrics,
        resistancePatterns: [],
        momentumPeriods: [],
        statChanges: {},
        winOfTheDay: metrics.questsCompleted > 0 ? `Completed ${metrics.questsCompleted} quests.` : 'Survived the day.',
        missOfTheDay: metrics.peakWindowUtilization < 50 ? 'Peak window underutilized.' : 'No major misses detected.',
        patternObserved: null,
        tomorrowPriority: 'Execute with consistency.',
        generatedAt: new Date().toISOString(),
      };

      const updated = [...aarHistory, aar];
      setAARHistory(updated);
      localStorage.setItem(AAR_HISTORY_KEY, JSON.stringify(updated.slice(-30)));
      setShowDailyModal(true);
    }

    setIsGenerating(false);
  }, [aarHistory, gatherDailyMetrics, player]);

  const generateWeeklyAAR = useCallback(async () => {
    setIsGenerating(true);

    const thisWeekAARs = aarHistory.filter(a => {
      const d = new Date(a.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo;
    });

    const totalXP = thisWeekAARs.reduce((s, a) => s + a.xpEarned, 0);
    const totalQuests = thisWeekAARs.reduce((s, a) => s + a.questsCompleted, 0);

    const bestDay = thisWeekAARs.reduce((best, a) =>
      a.xpEarned > (best?.xp || 0) ? { date: a.date, xp: a.xpEarned, grade: a.dayGrade } : best,
      { date: '', xp: 0, grade: 'F' }
    );
    const worstDay = thisWeekAARs.reduce((worst, a) =>
      (worst.xp === 0 || a.xpEarned < worst.xp) ? { date: a.date, xp: a.xpEarned, grade: a.dayGrade } : worst,
      { date: '', xp: Infinity, grade: 'S' }
    );

    const avgGrade = thisWeekAARs.length > 0
      ? calculateWeekGrade(thisWeekAARs.map(a => a.dayGrade))
      : 'C' as DayGrade;

    const weekly: WeeklyAAR = {
      id: generateId(),
      weekStart: thisWeekAARs[0]?.date || getSystemDate(),
      weekEnd: getSystemDate(),
      totalXP,
      xpVsLastWeek: 0,
      totalQuestsCompleted: totalQuests,
      questsVsLastWeek: 0,
      averageDailyCompletion: thisWeekAARs.length > 0
        ? Math.round(totalQuests / thisWeekAARs.length)
        : 0,
      bestDay,
      worstDay: worstDay.xp === Infinity ? { date: '', xp: 0, grade: 'F' } : worstDay,
      activeDays: thisWeekAARs.length,
      streakStatus: player.streak > 0 ? 'maintained' : 'broken',
      streakLength: player.streak,
      statChanges: {},
      strongestStat: 'discipline',
      weakestStat: 'sales',
      shadowsActivated: 0,
      shadowsExtracted: 0,
      dungeonsAttempted: 0,
      dungeonsCompleted: 0,
      dungeonSuccessRate: 0,
      consistentStrengths: [],
      persistentWeaknesses: [],
      behavioralLoops: [],
      weekSummary: `${thisWeekAARs.length} active days. ${totalQuests} quests completed. ${totalXP} XP earned.`,
      biggestWin: bestDay.date ? `${bestDay.grade}-rank day on ${bestDay.date}` : 'No standout day.',
      biggestMiss: worstDay.date && worstDay.xp !== Infinity ? `${worstDay.grade}-rank day on ${worstDay.date}` : 'No major misses.',
      patternAlert: null,
      nextWeekFocus: 'Maintain consistency and protect peak windows.',
      trajectoryUpdate: totalQuests > 20 ? 'Ahead of pace' : totalQuests > 10 ? 'On pace' : 'Behind pace',
      weekGrade: avgGrade,
      generatedAt: new Date().toISOString(),
    };

    setWeeklyAAR(weekly);
    localStorage.setItem(WEEKLY_AAR_KEY, JSON.stringify(weekly));
    setShowWeeklyModal(true);
    setIsGenerating(false);
  }, [aarHistory, player]);

  // Auto-generate at 9pm
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const today = getSystemDate();
      if (now.getHours() >= 21 && !aarHistory.find(a => a.date === today)) {
        generateDailyAAR();
      }
    };
    check();
    const interval = setInterval(check, 300000);
    return () => clearInterval(interval);
  }, [generateDailyAAR, aarHistory]);

  // Auto weekly on Sunday 8pm
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() >= 20) {
        const thisWeekStart = new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0];
        if (!weeklyAAR || weeklyAAR.weekStart !== thisWeekStart) {
          generateWeeklyAAR();
        }
      }
    };
    check();
  }, [generateWeeklyAAR, weeklyAAR]);

  return {
    todayAAR,
    weeklyAAR,
    aarHistory,
    isGenerating,
    showDailyModal,
    showWeeklyModal,
    setShowDailyModal,
    setShowWeeklyModal,
    generateDailyAAR,
    generateWeeklyAAR,
    getDayGrade: (date: string) => aarHistory.find(a => a.date === date)?.dayGrade,
    getAverageGrade: () => calculateWeekGrade(aarHistory.slice(-7).map(a => a.dayGrade)),
  };
}

function calculateWeekGrade(grades: DayGrade[]): DayGrade {
  if (grades.length === 0) return 'C';
  const gradeValues: Record<DayGrade, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const avg = grades.reduce((s, g) => s + gradeValues[g], 0) / grades.length;
  if (avg >= 5.5) return 'S';
  if (avg >= 4.5) return 'A';
  if (avg >= 3.5) return 'B';
  if (avg >= 2.5) return 'C';
  if (avg >= 1.5) return 'D';
  return 'F';
}
