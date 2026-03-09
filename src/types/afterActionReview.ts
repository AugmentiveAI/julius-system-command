import { PlayerStats } from '@/types/player';

export type DayGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface DailyAAR {
  id: string;
  date: string;

  // Performance metrics
  questsPlanned: number;
  questsCompleted: number;
  completionRate: number;
  xpEarned: number;
  xpVsDailyAverage: number;

  // Time analysis
  peakWindowUtilization: number;
  crashWindowViolations: number;
  totalFocusMinutes: number;
  sprintsCompleted: number;

  // Behavioral analysis
  resistancePatterns: string[];
  momentumPeriods: string[];

  // Stat changes
  statChanges: Partial<Record<keyof PlayerStats, number>>;

  // AI-generated insights
  winOfTheDay: string;
  missOfTheDay: string;
  patternObserved: string | null;
  tomorrowPriority: string;

  // Score
  dayGrade: DayGrade;

  generatedAt: string;
}

export interface WeeklyAAR {
  id: string;
  weekStart: string;
  weekEnd: string;

  totalXP: number;
  xpVsLastWeek: number;
  totalQuestsCompleted: number;
  questsVsLastWeek: number;
  averageDailyCompletion: number;

  bestDay: { date: string; xp: number; grade: string };
  worstDay: { date: string; xp: number; grade: string };
  activeDays: number;

  streakStatus: 'maintained' | 'grown' | 'broken' | 'started';
  streakLength: number;

  statChanges: Partial<Record<keyof PlayerStats, number>>;
  strongestStat: keyof PlayerStats;
  weakestStat: keyof PlayerStats;

  shadowsActivated: number;
  shadowsExtracted: number;

  dungeonsAttempted: number;
  dungeonsCompleted: number;
  dungeonSuccessRate: number;

  consistentStrengths: string[];
  persistentWeaknesses: string[];
  behavioralLoops: string[];

  weekSummary: string;
  biggestWin: string;
  biggestMiss: string;
  patternAlert: string | null;
  nextWeekFocus: string;
  trajectoryUpdate: string;

  weekGrade: DayGrade;

  generatedAt: string;
}

export interface DailyMetrics {
  completionRate: number;
  peakWindowUtilization: number;
  xpVsDailyAverage: number;
  crashWindowViolations: number;
}

export function calculateDayGrade(metrics: DailyMetrics): DayGrade {
  const score =
    (metrics.completionRate * 40) +
    (metrics.peakWindowUtilization / 100 * 25) +
    (metrics.xpVsDailyAverage > 0 ? 20 : metrics.xpVsDailyAverage > -20 ? 10 : 0) +
    (metrics.crashWindowViolations === 0 ? 15 : 0);

  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
