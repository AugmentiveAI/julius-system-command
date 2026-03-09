import { Cornerstone } from '@/types/cornerstone';
import { DailyAAR } from '@/types/afterActionReview';
import { QuestCompletionEntry } from '@/types/history';

interface CandidateBehavior {
  behavior: string;
  detect: (date: string, completions: QuestCompletionEntry[]) => boolean;
}

function getHour(isoStr: string): number {
  return new Date(isoStr).getHours();
}

const CANDIDATES: CandidateBehavior[] = [
  {
    behavior: 'First quest completed before 9am',
    detect: (date, completions) =>
      completions.some(c =>
        c.completedAt.startsWith(date) && getHour(c.completedAt) < 9
      ),
  },
  {
    behavior: 'Deep work during peak window (8-12)',
    detect: (date, completions) =>
      completions.filter(c =>
        c.completedAt.startsWith(date) && getHour(c.completedAt) >= 8 && getHour(c.completedAt) < 12
      ).length >= 2,
  },
  {
    behavior: '3+ quests completed by noon',
    detect: (date, completions) =>
      completions.filter(c =>
        c.completedAt.startsWith(date) && getHour(c.completedAt) < 12
      ).length >= 3,
  },
  {
    behavior: 'Exercise completed',
    detect: (date, completions) =>
      completions.some(c =>
        c.completedAt.startsWith(date) &&
        (c.questTitle.toLowerCase().includes('training') ||
         c.questTitle.toLowerCase().includes('workout') ||
         c.questTitle.toLowerCase().includes('exercise') ||
         c.questId === 'scheduled-training')
      ),
  },
  {
    behavior: 'All pillars completed',
    detect: (date, completions) => {
      const dayCompletions = completions.filter(c => c.completedAt.startsWith(date));
      // Simple heuristic — more than 5 quests suggests all pillars done
      return dayCompletions.length >= 5;
    },
  },
  {
    behavior: 'No late-night cramming (all quests before 9pm)',
    detect: (date, completions) => {
      const dayCompletions = completions.filter(c => c.completedAt.startsWith(date));
      return dayCompletions.length > 0 &&
        dayCompletions.every(c => getHour(c.completedAt) < 21);
    },
  },
];

interface CorrelationResult {
  success: number;
  absence: number;
  evidenceFor: string[];
  evidenceAgainst: string[];
  dataPoints: number;
}

function calculateCorrelation(
  aarHistory: DailyAAR[],
  detect: (date: string, completions: QuestCompletionEntry[]) => boolean,
  completions: QuestCompletionEntry[],
  isSuccess: (aar: DailyAAR) => boolean
): CorrelationResult {
  let behaviorPresent = 0;
  let behaviorAbsent = 0;
  let successWithBehavior = 0;
  let failWithoutBehavior = 0;
  const evidenceFor: string[] = [];
  const evidenceAgainst: string[] = [];

  for (const aar of aarHistory) {
    const hasBehavior = detect(aar.date, completions);
    const success = isSuccess(aar);

    if (hasBehavior) {
      behaviorPresent++;
      if (success) {
        successWithBehavior++;
        evidenceFor.push(`${aar.date}: ${aar.dayGrade}-rank day`);
      }
    } else {
      behaviorAbsent++;
      if (!success) {
        failWithoutBehavior++;
        evidenceAgainst.push(`${aar.date}: ${aar.dayGrade}-rank day (absent)`);
      }
    }
  }

  return {
    success: behaviorPresent > 0 ? successWithBehavior / behaviorPresent : 0,
    absence: behaviorAbsent > 0 ? failWithoutBehavior / behaviorAbsent : 0,
    evidenceFor: evidenceFor.slice(-5),
    evidenceAgainst: evidenceAgainst.slice(-5),
    dataPoints: aarHistory.length,
  };
}

export function identifyCornerstone(
  aarHistory: DailyAAR[],
  completions: QuestCompletionEntry[]
): Cornerstone | null {
  if (aarHistory.length < 7) return null;

  let best: Cornerstone | null = null;
  let highestScore = 0;

  for (const candidate of CANDIDATES) {
    const corr = calculateCorrelation(
      aarHistory,
      candidate.detect,
      completions,
      (aar) => aar.dayGrade <= 'B'
    );

    // Combined score weights success correlation more
    const score = corr.success * 0.6 + corr.absence * 0.4;

    if (score > highestScore && corr.dataPoints >= 7) {
      highestScore = score;
      const confidence = Math.min(95, Math.round(score * 100));
      best = {
        behavior: candidate.behavior,
        successCorrelation: Math.round(corr.success * 100),
        absenceCorrelation: Math.round(corr.absence * 100),
        evidenceFor: corr.evidenceFor,
        evidenceAgainst: corr.evidenceAgainst,
        dataPoints: corr.dataPoints,
        confidence,
        recommendation: `Protect "${candidate.behavior}" at all costs. This is your keystone habit.`,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  return best;
}

export function isCornerstoneHonoredToday(
  cornerstone: Cornerstone | null,
  completions: QuestCompletionEntry[]
): boolean {
  if (!cornerstone) return true;

  const today = new Date().toISOString().split('T')[0];
  const candidate = CANDIDATES.find(c => c.behavior === cornerstone.behavior);
  if (!candidate) return true;

  return candidate.detect(today, completions);
}
