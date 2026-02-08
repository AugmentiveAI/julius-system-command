import { QuestTemplate, QuestDifficulty, QuestCategory, QUEST_TEMPLATES } from '@/types/questDifficulty';

// ── Types ────────────────────────────────────────────────────────────

export interface CompletionEntry {
  questId: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  timeBlock: 'morning' | 'midday' | 'afternoon' | 'evening';
  completedAt: string; // ISO
  skipped: boolean;
}

export interface ResistancePoint {
  category: string;
  avoidanceRate: number; // 0-100
  pattern: ResistancePattern;
  systemStrategy: string;
  weekNumber: number; // escalation week (1-3+)
}

export interface StrengthPoint {
  category: string;
  completionRate: number; // 0-100
}

export type ResistancePattern =
  | 'category_avoidance'
  | 'difficulty_avoidance'
  | 'time_avoidance'
  | 'comfort_zone_lock'
  | 'streak_sabotage'
  | 'hard_avoidance';

export interface ResistanceAnalysis {
  resistancePoints: ResistancePoint[];
  strengthPoints: StrengthPoint[];
  overallResistanceScore: number; // 0-100
  hardAvoidanceQuests: { questId: string; questName: string; skipCount: number }[];
  xpModifiers: Record<string, number>; // category → multiplier
}

interface StoredResistanceData {
  lastAnalyzedDate: string;
  escalationWeeks: Record<string, number>; // pattern key → week count
  analysis: ResistanceAnalysis;
}

const RESISTANCE_STORAGE_KEY = 'systemResistanceData';

// ── Helpers ──────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

function getCompletionRate(entries: CompletionEntry[]): number {
  if (entries.length === 0) return 100;
  const completed = entries.filter(e => !e.skipped).length;
  return Math.round((completed / entries.length) * 100);
}

function loadEscalationWeeks(): Record<string, number> {
  try {
    const stored = localStorage.getItem(RESISTANCE_STORAGE_KEY);
    if (stored) {
      const data: StoredResistanceData = JSON.parse(stored);
      return data.escalationWeeks || {};
    }
  } catch { /* ignore */ }
  return {};
}

function incrementEscalation(key: string, weeks: Record<string, number>): number {
  weeks[key] = (weeks[key] || 0) + 1;
  return weeks[key];
}

// ── Strategy generators ──────────────────────────────────────────────

function categoryAvoidanceStrategy(category: string, week: number): string {
  if (week <= 1) {
    return `The System has identified ${category} as a resistance point. Difficulty reduced. Avoidance is not an option.`;
  }
  if (week === 2) {
    return `${category} resistance persists. Two quests assigned. The System adapts faster than you avoid.`;
  }
  return `${category} avoidance entering week ${week}. Combo quests engaged. The System will not relent.`;
}

function difficultyAvoidanceStrategy(category: string, currentTier: string, nextTier: string): string {
  return `You've mastered ${currentTier}-Rank in ${category}. The System is promoting you to ${nextTier}-Rank. Prove yourself.`;
}

function timeAvoidanceStrategy(timeBlock: string, rate: number): string {
  return `${timeBlock.charAt(0).toUpperCase() + timeBlock.slice(1)} quests show ${rate}% completion. The System has shortened ${timeBlock} tasks. No excuses.`;
}

function comfortZoneLockStrategy(strongCategories: string[], weakCategories: string[]): string {
  return `Diminishing returns detected in ${strongCategories.join(', ')}. XP reduced. Focus on ${weakCategories.join(', ')} to rebalance.`;
}

// ── Difficulty analysis ──────────────────────────────────────────────

const DIFFICULTY_RANK: Record<QuestDifficulty, number> = { D: 1, C: 2, B: 3, A: 4, S: 5 };
const DIFFICULTY_LABELS: Record<QuestDifficulty, string> = { D: 'D', C: 'C', B: 'B', A: 'A', S: 'S' };

function nextTier(d: QuestDifficulty): QuestDifficulty {
  const map: Record<QuestDifficulty, QuestDifficulty> = { D: 'C', C: 'B', B: 'A', A: 'S', S: 'S' };
  return map[d];
}

// ── Main Analysis Function ───────────────────────────────────────────

export function analyzeResistance(
  completionHistory: CompletionEntry[],
  questTemplates: QuestTemplate[] = QUEST_TEMPLATES,
): ResistanceAnalysis {
  const escalationWeeks = loadEscalationWeeks();
  const resistancePoints: ResistancePoint[] = [];
  const strengthPoints: StrengthPoint[] = [];
  const hardAvoidanceQuests: { questId: string; questName: string; skipCount: number }[] = [];
  const xpModifiers: Record<string, number> = {};

  // ── 1. Category analysis ──

  const byCategory = groupBy(completionHistory, e => e.category);
  const allCategories: QuestCategory[] = ['Sales', 'Systems', 'Creative', 'Discipline', 'Network', 'Wealth', 'Health', 'Learning'];

  const categoryRates: Record<string, number> = {};

  for (const category of allCategories) {
    const entries = byCategory[category] || [];
    const rate = getCompletionRate(entries);
    categoryRates[category] = rate;

    if (rate < 40 && entries.length >= 3) {
      const week = incrementEscalation(`cat_${category}`, escalationWeeks);
      resistancePoints.push({
        category,
        avoidanceRate: 100 - rate,
        pattern: 'category_avoidance',
        systemStrategy: categoryAvoidanceStrategy(category, week),
        weekNumber: week,
      });
      // Boost XP for avoided categories
      xpModifiers[category] = 1.5;
    } else if (rate > 80 && entries.length >= 5) {
      strengthPoints.push({ category, completionRate: rate });
    }
  }

  // ── 2. Hard avoidance (specific quests skipped 5+) ──

  const byQuest = groupBy(completionHistory.filter(e => e.skipped), e => e.questId);
  for (const [questId, skips] of Object.entries(byQuest)) {
    if (skips.length >= 5) {
      const template = questTemplates.find(t => t.id === questId);
      hardAvoidanceQuests.push({
        questId,
        questName: template?.name || questId,
        skipCount: skips.length,
      });
      resistancePoints.push({
        category: template?.category || 'Unknown',
        avoidanceRate: 100,
        pattern: 'hard_avoidance',
        systemStrategy: `"${template?.name || questId}" has been avoided ${skips.length} times. The System is making it mandatory.`,
        weekNumber: Math.ceil(skips.length / 5),
      });
    }
  }

  // ── 3. Time block avoidance ──

  const byTimeBlock = groupBy(completionHistory, e => e.timeBlock);
  for (const [block, entries] of Object.entries(byTimeBlock)) {
    const rate = getCompletionRate(entries);
    if (rate < 40 && entries.length >= 5) {
      incrementEscalation(`time_${block}`, escalationWeeks);
      resistancePoints.push({
        category: `${block} time block`,
        avoidanceRate: 100 - rate,
        pattern: 'time_avoidance',
        systemStrategy: timeAvoidanceStrategy(block, rate),
        weekNumber: escalationWeeks[`time_${block}`],
      });
    }
  }

  // ── 4. Difficulty avoidance ──

  for (const category of allCategories) {
    const entries = byCategory[category] || [];
    if (entries.length < 5) continue;

    const byDiff = groupBy(entries, e => e.difficulty);
    const lowTiers: QuestDifficulty[] = ['C', 'D'];
    const highTiers: QuestDifficulty[] = ['S', 'A'];

    const lowEntries = lowTiers.flatMap(d => byDiff[d] || []);
    const highEntries = highTiers.flatMap(d => byDiff[d] || []);

    const lowRate = getCompletionRate(lowEntries);
    const highRate = getCompletionRate(highEntries);

    if (lowRate > 70 && highRate < 30 && highEntries.length >= 3) {
      // Find the highest tier they consistently complete
      let comfortTier: QuestDifficulty = 'D';
      for (const d of (['B', 'C', 'D'] as QuestDifficulty[])) {
        const dEntries = byDiff[d] || [];
        if (getCompletionRate(dEntries) > 60) {
          comfortTier = d;
          break;
        }
      }
      const promoted = nextTier(comfortTier);
      incrementEscalation(`diff_${category}`, escalationWeeks);

      resistancePoints.push({
        category,
        avoidanceRate: 100 - highRate,
        pattern: 'difficulty_avoidance',
        systemStrategy: difficultyAvoidanceStrategy(category, DIFFICULTY_LABELS[comfortTier], DIFFICULTY_LABELS[promoted]),
        weekNumber: escalationWeeks[`diff_${category}`],
      });
    }
  }

  // ── 5. Comfort zone lock ──

  const activeCategories = Object.entries(categoryRates).filter(([, r]) => r > 70);
  const neglectedCategories = Object.entries(categoryRates).filter(([, r]) => r < 40);

  if (activeCategories.length <= 2 && neglectedCategories.length >= 3) {
    const strongNames = activeCategories.map(([c]) => c);
    const weakNames = neglectedCategories.map(([c]) => c);

    resistancePoints.push({
      category: 'Multi-category',
      avoidanceRate: Math.round(neglectedCategories.reduce((s, [, r]) => s + (100 - r), 0) / neglectedCategories.length),
      pattern: 'comfort_zone_lock',
      systemStrategy: comfortZoneLockStrategy(strongNames, weakNames),
      weekNumber: incrementEscalation('comfort_zone', escalationWeeks),
    });

    // Reduce XP on over-trained, boost under-trained
    for (const [cat] of activeCategories) {
      xpModifiers[cat] = 0.75;
    }
    for (const [cat] of neglectedCategories) {
      xpModifiers[cat] = (xpModifiers[cat] || 1) * 1.5;
    }
  }

  // ── 6. Streak sabotage detection ──

  // Look for pattern: quests completed for 5-6 days then sudden zero on day 7
  // (Simplified: check if there are 3+ instances of streaks broken at 5+ days)
  // This requires streak data which we approximate from consecutive days
  const completedDays = new Set(
    completionHistory.filter(e => !e.skipped).map(e => e.completedAt.split('T')[0])
  );
  const sortedDays = [...completedDays].sort();
  let streakBreaks = 0;
  let currentStreak = 0;

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      currentStreak = 1;
      continue;
    }
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
    } else {
      if (currentStreak >= 5 && currentStreak <= 7) {
        streakBreaks++;
      }
      currentStreak = 1;
    }
  }

  if (streakBreaks >= 3) {
    resistancePoints.push({
      category: 'Streaks',
      avoidanceRate: Math.min(100, streakBreaks * 20),
      pattern: 'streak_sabotage',
      systemStrategy: `Self-sabotage pattern detected. ${streakBreaks} streaks broken near milestones. The System sees the pattern you don't.`,
      weekNumber: incrementEscalation('streak_sabotage', escalationWeeks),
    });
  }

  // ── Calculate overall resistance score ──

  let overallResistanceScore = 0;
  if (resistancePoints.length > 0) {
    const avgAvoidance = resistancePoints.reduce((s, r) => s + r.avoidanceRate, 0) / resistancePoints.length;
    const patternPenalty = Math.min(30, resistancePoints.length * 5);
    const hardAvoidPenalty = Math.min(20, hardAvoidanceQuests.length * 4);
    overallResistanceScore = Math.min(100, Math.round(avgAvoidance * 0.5 + patternPenalty + hardAvoidPenalty));
  }

  // ── Persist ──

  const analysis: ResistanceAnalysis = {
    resistancePoints,
    strengthPoints,
    overallResistanceScore,
    hardAvoidanceQuests,
    xpModifiers,
  };

  try {
    const data: StoredResistanceData = {
      lastAnalyzedDate: new Date().toISOString().split('T')[0],
      escalationWeeks,
      analysis,
    };
    localStorage.setItem(RESISTANCE_STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }

  return analysis;
}

/** Load cached resistance analysis without re-computing */
export function loadCachedResistance(): ResistanceAnalysis | null {
  try {
    const stored = localStorage.getItem(RESISTANCE_STORAGE_KEY);
    if (stored) {
      const data: StoredResistanceData = JSON.parse(stored);
      return data.analysis;
    }
  } catch { /* ignore */ }
  return null;
}
