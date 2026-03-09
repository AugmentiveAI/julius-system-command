import { PlayerStats } from '@/types/player';

export type LoopType = 'avoidance' | 'consistency' | 'timing' | 'sequence' | 'conditional';
export type LoopValence = 'positive' | 'negative' | 'neutral';

export interface NarrativeLoop {
  id: string;
  type: LoopType;
  valence: LoopValence;

  pattern: string;
  evidence: string[];
  occurrences: number;
  confidence: number;

  firstDetected: string;
  lastOccurrence: string;

  impact: {
    stat?: keyof PlayerStats;
    xpLost?: number;
    streakRisk?: boolean;
  };

  breakStrategy?: string;

  status: 'active' | 'broken' | 'monitoring';
}
