import { Rank } from './player';

export interface MainQuest {
  id: string;
  title: string;
  xpReward: number;
  unlocksTitle: Rank;
  completed: boolean;
  completedAt?: string; // ISO date string
}

export interface MainQuestState {
  quests: MainQuest[];
}

// Rank hierarchy for determining highest title
export const RANK_ORDER: Rank[] = [
  'E-Rank Hunter',
  'D-Rank Hunter',
  'C-Rank Hunter',
  'B-Rank Hunter',
  'A-Rank Hunter',
  'S-Rank Hunter',
  'Monarch Candidate',
  'Shadow Monarch',
];

export function getHighestRank(completedRanks: Rank[]): Rank {
  if (completedRanks.length === 0) return 'E-Rank Hunter';
  
  let highestIndex = 0;
  completedRanks.forEach(rank => {
    const index = RANK_ORDER.indexOf(rank);
    if (index > highestIndex) {
      highestIndex = index;
    }
  });
  
  return RANK_ORDER[highestIndex];
}

export const DEFAULT_MAIN_QUESTS: Omit<MainQuest, 'completed' | 'completedAt'>[] = [
  {
    id: 'first-client',
    title: 'Close first paying client',
    xpReward: 500,
    unlocksTitle: 'D-Rank Hunter',
  },
  {
    id: '5k-mrr',
    title: 'Reach $5K MRR',
    xpReward: 1000,
    unlocksTitle: 'C-Rank Hunter',
  },
  {
    id: '10k-mrr',
    title: 'Reach $10K MRR',
    xpReward: 2500,
    unlocksTitle: 'A-Rank Hunter',
  },
  {
    id: 'exit-staar',
    title: 'Exit STAAR Surgical on your terms',
    xpReward: 5000,
    unlocksTitle: 'S-Rank Hunter',
  },
  {
    id: 'hire-team',
    title: 'Hire first contractor / build a team',
    xpReward: 1500,
    unlocksTitle: 'Monarch Candidate',
  },
];
