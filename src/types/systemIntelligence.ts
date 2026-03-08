export interface TrajectoryForecast {
  currentPace: string;
  optimizedPace: string;
  ceiling: string;
  criticalLeverage: string;
}

export interface DynamicChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'B-Rank' | 'A-Rank' | 'S-Rank';
  xpReward: number;
  timeEstimate: string;
  leverageType: 'revenue' | 'skill' | 'network' | 'systems' | 'compound';
}

export interface SuggestedShadow {
  name: string;
  category: 'automation' | 'client' | 'content' | 'sop' | 'skill' | 'tool';
  description: string;
  reasoning: string;
  firstAction?: string;
  activationType?: 'template' | 'protocol' | 'system' | 'framework' | 'exercise' | 'tool_setup' | 'creative';
}

export interface SuggestedDungeon {
  title: string;
  description: string;
  type: 'boss_fight' | 'instant_dungeon' | 's_rank_gate';
  difficulty: 'B-Rank' | 'A-Rank' | 'S-Rank';
  objectives: string[];
  xpReward: number;
  timeEstimate: string;
  reasoning: string;
}

export interface AnticipationToday {
  peakWindow: string;
  crashWindow: string;
  streakRisk: boolean;
  optimalQuestOrder: string[];
  warnings: string[];
}

export interface AnticipationWeek {
  sprintDays: string[];
  projectedXP: number;
  riskFactors: string[];
  opportunities: string[];
}

export interface AnticipationStrategic {
  currentTrajectory: string;
  requiredAcceleration: string;
  biggestLeverage: string;
  bottleneck: string;
}

export interface Anticipation {
  today: AnticipationToday;
  thisWeek: AnticipationWeek;
  strategic: AnticipationStrategic;
}

export interface SystemIntelligence {
  dailyBrief: string;
  strategicAnalysis: string;
  trajectoryForecast: TrajectoryForecast;
  dynamicChallenges: DynamicChallenge[];
  suggestedShadows?: SuggestedShadow[];
  suggestedDungeons?: SuggestedDungeon[];
  anticipation?: Anticipation | null;
  patternAlert?: string | null;
  systemConfidence: number;
  generatedAt: string;
}
