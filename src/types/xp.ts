// Fixed level thresholds (cumulative total XP required)
export const LEVEL_THRESHOLDS = [
  0,       // Level 1
  500,     // Level 2
  1500,    // Level 3
  3500,    // Level 4
  7000,    // Level 5
  12000,   // Level 6
  20000,   // Level 7
  32000,   // Level 8
  50000,   // Level 9
  75000,   // Level 10
] as const;

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export interface DailyXPBreakdown {
  quests: number;
  geneticBonuses: number;
  training: number;
  streakBonus: number;
  total: number;
  max: number;
}

export function getLevelFromTotalXP(totalXP: number): { level: number; currentXP: number; xpToNextLevel: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      currentXP: totalXP - LEVEL_THRESHOLDS[MAX_LEVEL - 1],
      xpToNextLevel: 0, // Max level
    };
  }

  const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextLevelThreshold = LEVEL_THRESHOLDS[level];

  return {
    level,
    currentXP: totalXP - currentLevelThreshold,
    xpToNextLevel: nextLevelThreshold - currentLevelThreshold,
  };
}

/** Max daily XP estimate: ~525 with all bonuses */
export const DAILY_XP_MAX = 525;

export function getColdStreakBonus(coldStreakDays: number): number {
  return Math.min(coldStreakDays * 10, 70);
}
