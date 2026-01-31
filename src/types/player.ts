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

export interface Player {
  name: string;
  title: Rank;
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  stats: PlayerStats;
  streak: number;
}

export const INITIAL_PLAYER: Player = {
  name: 'Julius',
  title: 'E-Rank Hunter',
  level: 1,
  currentXP: 0,
  xpToNextLevel: 100,
  stats: {
    sales: 10,
    systems: 10,
    creative: 10,
    discipline: 10,
    network: 10,
    wealth: 10,
  },
  streak: 0,
};
