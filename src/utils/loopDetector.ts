import { NarrativeLoop, LoopType, LoopValence } from '@/types/narrativeLoop';
import { QuestCompletionEntry } from '@/types/history';

interface DetectedPattern {
  type: LoopType;
  valence: LoopValence;
  pattern: string;
  evidence: string[];
  occurrences: number;
  confidence: number;
  impact?: NarrativeLoop['impact'];
  breakStrategy?: string;
}

function getDayName(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

function getHour(isoStr: string): number {
  return new Date(isoStr).getHours();
}

// Detect weekday-specific avoidance
function detectWeekdayAvoidance(completions: QuestCompletionEntry[]): DetectedPattern | null {
  if (completions.length < 10) return null;

  const dayCompletions: Record<string, number> = {};
  const dayDates: Record<string, string[]> = {};
  const allDates = new Set<string>();

  completions.forEach(c => {
    const date = c.completedAt.split('T')[0];
    allDates.add(date);
    const day = getDayName(date);
    dayCompletions[day] = (dayCompletions[day] || 0) + 1;
    if (!dayDates[day]) dayDates[day] = [];
    if (!dayDates[day].includes(date)) dayDates[day].push(date);
  });

  // Find dates with zero completions grouped by day
  const allDatesSorted = Array.from(allDates).sort();
  if (allDatesSorted.length < 14) return null;

  const firstDate = new Date(allDatesSorted[0] + 'T12:00:00');
  const lastDate = new Date(allDatesSorted[allDatesSorted.length - 1] + 'T12:00:00');
  const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (86400000)) + 1;

  // Build set of all dates in range
  const dateSet = new Set(allDatesSorted);
  const zeroDaysByWeekday: Record<string, string[]> = {};

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(firstDate.getTime() + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    if (!dateSet.has(dateStr)) {
      if (!zeroDaysByWeekday[dayName]) zeroDaysByWeekday[dayName] = [];
      zeroDaysByWeekday[dayName].push(dateStr);
    }
  }

  for (const [day, dates] of Object.entries(zeroDaysByWeekday)) {
    if (dates.length >= 3) {
      return {
        type: 'avoidance',
        valence: 'negative',
        pattern: `Consistently inactive on ${day}s`,
        evidence: dates.slice(-4).map(d => `${d}: zero completions`),
        occurrences: dates.length,
        confidence: Math.min(95, 60 + dates.length * 8),
        impact: { streakRisk: true },
        breakStrategy: `Schedule at least 1 quest every ${day} morning.`,
      };
    }
  }
  return null;
}

// Detect category avoidance
function detectCategoryAvoidance(completions: QuestCompletionEntry[]): DetectedPattern | null {
  if (completions.length < 15) return null;

  const categoryCount: Record<string, number> = {};
  completions.forEach(c => {
    const cat = c.type || 'daily';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  // Check for categories that appear in quests but rarely completed
  // This is simplified — in production you'd compare against assigned quests
  const total = completions.length;
  for (const [cat, count] of Object.entries(categoryCount)) {
    const rate = count / total;
    if (rate < 0.05 && count >= 2) {
      return {
        type: 'avoidance',
        valence: 'negative',
        pattern: `Low engagement with ${cat} quests (${Math.round(rate * 100)}% of completions)`,
        evidence: [`Only ${count} ${cat} quests completed out of ${total} total`],
        occurrences: total - count,
        confidence: 70,
        breakStrategy: `Complete at least one ${cat} quest today.`,
      };
    }
  }
  return null;
}

// Detect peak productivity time
function detectTimeConsistency(completions: QuestCompletionEntry[]): DetectedPattern | null {
  if (completions.length < 10) return null;

  const hourCounts: Record<number, number> = {};
  completions.forEach(c => {
    const h = getHour(c.completedAt);
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  const total = completions.length;
  let peakHour = 0;
  let peakCount = 0;
  for (const [h, count] of Object.entries(hourCounts)) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = parseInt(h);
    }
  }

  const peakPct = peakCount / total;
  if (peakPct > 0.25 && peakCount >= 5) {
    const hourStr = peakHour <= 12
      ? `${peakHour}am`
      : `${peakHour - 12}pm`;
    return {
      type: 'timing',
      valence: 'positive',
      pattern: `Most productive at ${hourStr} (${Math.round(peakPct * 100)}% of completions)`,
      evidence: [`${peakCount} quests completed during ${hourStr} hour`],
      occurrences: peakCount,
      confidence: Math.min(90, 60 + peakCount * 3),
    };
  }
  return null;
}

// Detect late-night patterns
function detectLateNightPattern(completions: QuestCompletionEntry[]): DetectedPattern | null {
  const lateCompletions = completions.filter(c => getHour(c.completedAt) >= 22);
  if (lateCompletions.length >= 5) {
    const pct = Math.round((lateCompletions.length / completions.length) * 100);
    return {
      type: 'timing',
      valence: 'negative',
      pattern: `${pct}% of quests completed after 10pm — cramming pattern`,
      evidence: lateCompletions.slice(-3).map(c =>
        `${c.completedAt.split('T')[0]}: \"${c.questTitle}\" at ${new Date(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      ),
      occurrences: lateCompletions.length,
      confidence: 75,
      breakStrategy: 'Complete at least 2 quests before 2pm.',
    };
  }
  return null;
}

export function detectLoops(completions: QuestCompletionEntry[]): DetectedPattern[] {
  const results: DetectedPattern[] = [];

  const detectors = [
    detectWeekdayAvoidance,
    detectCategoryAvoidance,
    detectTimeConsistency,
    detectLateNightPattern,
  ];

  for (const detector of detectors) {
    const result = detector(completions);
    if (result) results.push(result);
  }

  return results;
}

export function mergeDetectedLoops(
  existing: NarrativeLoop[],
  detected: DetectedPattern[]
): NarrativeLoop[] {
  const now = new Date().toISOString();
  const merged: NarrativeLoop[] = [];

  for (const d of detected) {
    const match = existing.find(e => e.pattern === d.pattern);
    if (match) {
      merged.push({
        ...match,
        occurrences: d.occurrences,
        confidence: d.confidence,
        evidence: d.evidence,
        lastOccurrence: now,
      });
    } else {
      merged.push({
        id: `loop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: d.type,
        valence: d.valence,
        pattern: d.pattern,
        evidence: d.evidence,
        occurrences: d.occurrences,
        confidence: d.confidence,
        firstDetected: now,
        lastOccurrence: now,
        impact: d.impact || {},
        breakStrategy: d.breakStrategy,
        status: 'active',
      });
    }
  }

  // Keep previously detected loops that weren't re-detected as 'monitoring'
  for (const e of existing) {
    if (!merged.find(m => m.id === e.id)) {
      merged.push({ ...e, status: 'monitoring' });
    }
  }

  return merged;
}
