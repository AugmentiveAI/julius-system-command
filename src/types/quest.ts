import { PlayerStats } from './player';

export interface Quest {
  id: string;
  title: string;
  stat: keyof PlayerStats;
  xpReward: number;
  completed: boolean;
}

export interface DailyQuestState {
  quests: Quest[];
  lastResetDate: string; // ISO date string (YYYY-MM-DD)
}

export const DEFAULT_DAILY_QUESTS: Omit<Quest, 'completed'>[] = [
  {
    id: 'cold-outreach',
    title: 'Send 10 cold outreach messages',
    stat: 'sales',
    xpReward: 5,
  },
  {
    id: 'deep-work',
    title: 'Complete one 45-min deep work sprint',
    stat: 'systems',
    xpReward: 5,
  },
  {
    id: 'exercise',
    title: 'Exercise for 30 minutes',
    stat: 'discipline',
    xpReward: 3,
  },
  {
    id: 'financials',
    title: 'Review financials or pipeline',
    stat: 'wealth',
    xpReward: 2,
  },
  {
    id: 'content',
    title: 'Create one piece of content or documentation',
    stat: 'creative',
    xpReward: 3,
  },
];

export const STAT_LABELS: Record<keyof PlayerStats, string> = {
  sales: 'Sales',
  systems: 'Systems',
  creative: 'Creative',
  discipline: 'Discipline',
  network: 'Network',
  wealth: 'Wealth',
};
