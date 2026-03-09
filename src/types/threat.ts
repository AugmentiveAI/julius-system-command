export type ThreatCategory =
  | 'streak'
  | 'fatigue'
  | 'pipeline'
  | 'genetic'
  | 'momentum'
  | 'stat_decay'
  | 'deadline'
  | 'penalty';

export type ThreatLevel = 'nominal' | 'elevated' | 'high' | 'critical';

export interface Threat {
  id: string;
  category: ThreatCategory;
  level: ThreatLevel;
  title: string;
  description: string;
  metric: string;
  recommendation: string;
  detectedAt: string;
  expiresAt?: string;
}

export interface ThreatAssessment {
  overallLevel: ThreatLevel;
  threats: Threat[];
  lastUpdated: string;
}

export interface ThreatContext {
  currentHour: number;
  questsCompletedToday: number;
  questsTotalToday: number;
  streak: number;
  coldStreak: number;
  fatigueAccumulation: number;
  geneticPhase: string;
  consecutiveZeroDays: number;
  penaltyDungeonActive: boolean;
  penaltyTimeRemaining?: string;
  daysSinceLastOutreach: number;
  questsCompletedLast3Days: number;
  deepWorkCompletedToday: number;
  attemptingHighCognitionTask: boolean;
  daysToExitDeadline: number;
  currentMRR: number;
  targetMRR: number;
  sprintsToday: number;
}

export const THREAT_LEVEL_PRIORITY: Record<ThreatLevel, number> = {
  nominal: 0,
  elevated: 1,
  high: 2,
  critical: 3,
};
