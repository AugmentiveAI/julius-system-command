export interface PlayerStats {
  sales: number;
  systems: number;
  creative: number;
  discipline: number;
  network: number;
  wealth: number;
}

export type Rank = 
  | 'E-Rank Hunter'
  | 'D-Rank Hunter'
  | 'C-Rank Hunter'
  | 'B-Rank Hunter'
  | 'A-Rank Hunter'
  | 'S-Rank Hunter'
  | 'Monarch Candidate'
  | 'Shadow Monarch';

export type PenaltyLevel = 0 | 1 | 2 | 3;

export interface PenaltyState {
  consecutiveZeroDays: number;
  lastCompletionDate: string | null; // ISO date when at least 1 quest was completed
  bannerDismissedForSession: boolean;
  penaltyAppliedForCurrentLevel: boolean; // Prevents applying same penalty multiple times
}

export interface Player {
  name: string;
  title: Rank;
  level: number;
  totalXP: number;
  currentXP: number;
  xpToNextLevel: number;
  stats: PlayerStats;
  streak: number;
  coldStreak: number;
  penalty: PenaltyState;
}

export const INITIAL_PENALTY: PenaltyState = {
  consecutiveZeroDays: 0,
  lastCompletionDate: null,
  bannerDismissedForSession: false,
  penaltyAppliedForCurrentLevel: false,
};

export const INITIAL_PLAYER: Player = {
  name: 'Julius',
  title: 'E-Rank Hunter',
  level: 1,
  totalXP: 0,
  currentXP: 0,
  xpToNextLevel: 500,
  stats: {
    sales: 10,
    systems: 10,
    creative: 10,
    discipline: 10,
    network: 10,
    wealth: 10,
  },
  streak: 0,
  coldStreak: 0,
  penalty: INITIAL_PENALTY,
};

export function getLowestStat(stats: PlayerStats): keyof PlayerStats {
  let lowestKey: keyof PlayerStats = 'sales';
  let lowestValue = stats.sales;

  (Object.keys(stats) as Array<keyof PlayerStats>).forEach(key => {
    if (stats[key] < lowestValue) {
      lowestValue = stats[key];
      lowestKey = key;
    }
  });

  return lowestKey;
}

export function getPenaltyLevel(consecutiveZeroDays: number): PenaltyLevel {
  if (consecutiveZeroDays >= 3) return 3;
  if (consecutiveZeroDays === 2) return 2;
  if (consecutiveZeroDays === 1) return 1;
  return 0;
}
