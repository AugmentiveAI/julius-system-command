export interface ExecutionPatterns {
  peakHours: number[];
  peakDays: string[];
  averageQuestsPerDay: number;
  averageQuestsOnPeakDays: number;
  averageQuestsOnOffDays: number;
  completionRateByHour: Record<number, number>;
  completionRateByCategory: Record<string, number>;
  averageSprintDuration: number;
  optimalSprintLength: number;
}

export interface AvoidancePatterns {
  avoidedCategories: string[];
  avoidanceHours: number[];
  avoidanceTriggers: string[];
  averageProcrastinationTime: number;
}

export interface EnergyPatterns {
  energyByHour: Record<number, number>;
  energyBySleepHours: Record<number, number>;
  energyBoostFromExercise: number;
  crashHours: number[];
  crashRecoveryTime: number;
}

export interface StreakPatterns {
  averageStreakLength: number;
  longestStreak: number;
  streakBreakers: string[];
  streakProtectors: string[];
}

export interface GoalPatterns {
  goalCompletionRate: number;
  successfulGoalTypes: string[];
  avgTimeToCompleteByType: Record<string, number>;
}

export interface ResponsePatterns {
  messageReadRate: number;
  messageActedOnRate: number;
  effectiveMessageTypes: string[];
  ignoredMessageTypes: string[];
  preferredTone: 'direct' | 'encouraging' | 'analytical';
}

export interface DerivedInsights {
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
}

export interface UserLearning {
  userId: string;
  lastUpdated: string;
  execution: ExecutionPatterns;
  avoidance: AvoidancePatterns;
  energy: EnergyPatterns;
  streaks: StreakPatterns;
  goals: GoalPatterns;
  responses: ResponsePatterns;
  insights: DerivedInsights;
}

export interface ResearchSource {
  type: 'twitter' | 'youtube' | 'reddit' | 'website' | 'newsletter' | 'rss';
  target: string;
  active: boolean;
}

export interface ResearchFinding {
  id: string;
  shadowId: string;
  timestamp: string;
  source: {
    type: string;
    target: string;
    url?: string;
  };
  content: {
    title: string;
    summary: string;
    keyInsights: string[];
    relevanceScore: number;
    actionability: number;
  };
  status: 'new' | 'read' | 'acted_on' | 'dismissed';
  synthesis?: {
    connectionToUser: string;
    suggestedAction: string;
    priority: 'high' | 'medium' | 'low';
  };
}

export interface ShadowResearchConfig {
  enabled: boolean;
  sources: ResearchSource[];
  searchPatterns: {
    keywords: string[];
    topics: string[];
  };
  reporting: {
    frequency: 'realtime' | 'daily' | 'weekly';
    priorityThreshold: number;
  };
  stats: {
    lastRun: string;
    findingsCount: number;
    actedOnCount: number;
    usefulness: number;
  };
}

export interface SynthesizedInsight {
  id: string;
  timestamp: string;
  type: 'pattern' | 'opportunity' | 'warning' | 'recommendation';
  headline: string;
  detail: string;
  sources: {
    userPattern?: string;
    shadowFinding?: ResearchFinding;
    goalConnection?: string;
  };
  suggestedAction?: {
    type: 'quest' | 'research' | 'decision' | 'habit';
    description: string;
    priority: 'high' | 'medium' | 'low';
  };
  priority: number;
  delivered: boolean;
  deliveredAt?: string;
  actedOn?: boolean;
}

export interface JarvisAnticipation {
  id: string;
  type: 'preparation' | 'reminder' | 'opportunity' | 'prevention';
  prediction: string;
  confidence: number;
  expectedTime: string;
  windowStart: string;
  windowEnd: string;
  preparation?: {
    type: 'information' | 'task' | 'decision';
    description: string;
    preparedContent?: string;
  };
  surfaced: boolean;
  surfacedAt?: string;
}

export interface ProactiveMessage {
  type: 'anticipation' | 'insight' | 'shadow_intel' | 'nudge';
  short: string;
  full: string;
  priority: 'high' | 'medium' | 'low';
  actions?: { label: string; action: string }[];
}
