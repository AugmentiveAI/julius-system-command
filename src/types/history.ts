export interface QuestCompletionEntry {
  id: string;
  questId: string;
  questTitle: string;
  xpEarned: number;
  completedAt: string; // ISO date string
  type: 'daily' | 'main';
}

export interface HistoryState {
  completions: QuestCompletionEntry[];
}

export interface DaySummary {
  date: string;
  entries: QuestCompletionEntry[];
  totalXP: number;
}

export interface WeeklySummary {
  totalXP: number;
  questsCompleted: number;
  daysActive: number;
  startDate: string;
  endDate: string;
}
