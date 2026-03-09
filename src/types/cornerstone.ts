export interface Cornerstone {
  behavior: string;

  successCorrelation: number;
  absenceCorrelation: number;

  evidenceFor: string[];
  evidenceAgainst: string[];

  dataPoints: number;
  confidence: number;

  recommendation: string;

  lastUpdated: string;
}
