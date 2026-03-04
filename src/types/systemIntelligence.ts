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

export interface SystemIntelligence {
  dailyBrief: string;
  strategicAnalysis: string;
  trajectoryForecast: TrajectoryForecast;
  dynamicChallenges: DynamicChallenge[];
  patternAlert?: string | null;
  systemConfidence: number;
  generatedAt: string;
}
