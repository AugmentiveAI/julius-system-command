import { ThreatCategory } from './threat';
import { PlayerStats } from './player';

export type EmergencyTriggerType = ThreatCategory | 'opportunity' | 'system';
export type EmergencyDifficulty = 'A' | 'S';
export type EmergencyStatus = 'pending' | 'active' | 'completed' | 'failed' | 'expired';

export interface EmergencyObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface EmergencyPenalty {
  type: 'stat_loss' | 'streak_reset' | 'xp_loss';
  amount: number;
  stat?: keyof PlayerStats;
}

export interface EmergencyQuest {
  id: string;
  title: string;
  description: string;
  triggeredBy: EmergencyTriggerType;
  difficulty: EmergencyDifficulty;
  xpReward: number;
  statReward: {
    stat: keyof PlayerStats;
    amount: number;
  };
  timeLimit: number | null; // Minutes, null = until midnight
  penalty: EmergencyPenalty | null;
  objectives: EmergencyObjective[];
  status: EmergencyStatus;
  triggeredAt: string;
  expiresAt: string;
  isOpportunity: boolean; // true = surge (no penalty), false = threat emergency
}

export interface EmergencyContext {
  currentHour: number;
  questsCompletedToday: number;
  streak: number;
  consecutiveZeroDays: number;
  penaltyDungeonActive: boolean;
  geneticPhase: string;
  deepWorkCompletedToday: number;
  lastQuestCompletedMinutesAgo: number;
  emergencyQuestActiveToday: boolean;
  emergencyCountToday: number;
  dayOfWeek: number;
  weeklyXP: number;
  weeklyTargetXP: number;
  hasCriticalStreakThreat: boolean;
  hasCriticalPipelineThreat: boolean;
  sprintsToday: number;
}

export interface EmergencyTriggerRule {
  id: string;
  condition: (ctx: EmergencyContext) => boolean;
  build: (ctx: EmergencyContext) => Omit<EmergencyQuest, 'id' | 'triggeredAt' | 'expiresAt' | 'status'>;
}
