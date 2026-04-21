import { describe, it, expect } from 'vitest';
import { evaluateThreats, getOverallLevel } from '@/utils/threatEngine';
import type { ThreatContext, ThreatLevel } from '@/types/threat';

/**
 * PR1c — engine behavior lock for threatEngine.
 * Invariants: rule set produces deterministic threats; severity ordering correct.
 */

const baseCtx = (over: Partial<ThreatContext> = {}): ThreatContext => ({
  currentHour: 10,
  questsCompletedToday: 2,
  questsTotalToday: 5,
  streak: 5,
  coldStreak: 0,
  fatigueAccumulation: 10,
  geneticPhase: 'stable',
  consecutiveZeroDays: 0,
  penaltyDungeonActive: false,
  daysSinceLastOutreach: 0,
  questsCompletedLast3Days: 8,
  deepWorkCompletedToday: 1,
  attemptingHighCognitionTask: false,
  daysToExitDeadline: 90,
  currentMRR: 1000,
  targetMRR: 10000,
  sprintsToday: 0,
  ...over,
});

describe('evaluateThreats — quiet baseline', () => {
  it('emits zero threats on a healthy context', () => {
    expect(evaluateThreats(baseCtx())).toEqual([]);
  });
});

describe('evaluateThreats — streak rules', () => {
  it('elevated streak warning between 18 and 21 with 0 quests', () => {
    const t = evaluateThreats(baseCtx({ currentHour: 19, questsCompletedToday: 0 }));
    expect(t.find(x => x.id === 'streak_warning')?.level).toBe('elevated');
  });

  it('critical streak after 21 with 0 quests', () => {
    const t = evaluateThreats(baseCtx({ currentHour: 22, questsCompletedToday: 0 }));
    expect(t.find(x => x.id === 'streak_critical')?.level).toBe('critical');
  });

  it('no streak threat when streak=0', () => {
    const t = evaluateThreats(baseCtx({ currentHour: 22, questsCompletedToday: 0, streak: 0 }));
    expect(t.find(x => x.category === 'streak')).toBeUndefined();
  });
});

describe('evaluateThreats — fatigue rules', () => {
  it.each([
    { f: 27, expected: undefined },
    { f: 28, expected: 'elevated' as const },
    { f: 34, expected: 'elevated' as const },
    { f: 35, expected: 'high' as const },
    { f: 40, expected: 'high' as const },
  ])('fatigue=$f → $expected', ({ f, expected }) => {
    const t = evaluateThreats(baseCtx({ fatigueAccumulation: f }));
    const fatigue = t.find(x => x.category === 'fatigue');
    expect(fatigue?.level).toBe(expected);
  });
});

describe('evaluateThreats — pipeline rules', () => {
  it.each([
    { d: 2, expected: undefined },
    { d: 3, expected: 'elevated' as const },
    { d: 4, expected: 'elevated' as const },
    { d: 5, expected: 'critical' as const },
    { d: 10, expected: 'critical' as const },
  ])('daysSinceLastOutreach=$d → $expected', ({ d, expected }) => {
    const t = evaluateThreats(baseCtx({ daysSinceLastOutreach: d }));
    const pipeline = t.find(x => x.category === 'pipeline');
    expect(pipeline?.level).toBe(expected);
  });
});

describe('evaluateThreats — penalty rules', () => {
  it('penalty_imminent fires on 1 zero day with no active dungeon', () => {
    const t = evaluateThreats(baseCtx({ consecutiveZeroDays: 1 }));
    expect(t.find(x => x.id === 'penalty_imminent')?.level).toBe('high');
  });

  it('penalty_imminent suppressed when dungeon already active', () => {
    const t = evaluateThreats(baseCtx({ consecutiveZeroDays: 1, penaltyDungeonActive: true }));
    expect(t.find(x => x.id === 'penalty_imminent')).toBeUndefined();
    expect(t.find(x => x.id === 'penalty_active')?.level).toBe('critical');
  });
});

describe('evaluateThreats — genetic rules', () => {
  it('crash window + high-cognition attempt → high genetic threat', () => {
    const t = evaluateThreats(baseCtx({ geneticPhase: 'dip', attemptingHighCognitionTask: true }));
    expect(t.find(x => x.id === 'genetic_crash_active')?.level).toBe('high');
  });

  it('no crash threat when not attempting cognition', () => {
    const t = evaluateThreats(baseCtx({ geneticPhase: 'dip', attemptingHighCognitionTask: false }));
    expect(t.find(x => x.id === 'genetic_crash_active')).toBeUndefined();
  });
});

describe('evaluateThreats — deadline scaling', () => {
  it('14-day deadline is critical, 30-day is high', () => {
    const t14 = evaluateThreats(baseCtx({ daysToExitDeadline: 14 }));
    const t30 = evaluateThreats(baseCtx({ daysToExitDeadline: 30 }));
    expect(t14.find(x => x.category === 'deadline')?.level).toBe('critical');
    expect(t30.find(x => x.category === 'deadline')?.level).toBe('high');
  });

  it('no deadline threat beyond 30 days', () => {
    const t = evaluateThreats(baseCtx({ daysToExitDeadline: 60 }));
    expect(t.find(x => x.category === 'deadline')).toBeUndefined();
  });
});

describe('evaluateThreats — output shape', () => {
  it('every threat includes id, detectedAt, category, level, recommendation', () => {
    const t = evaluateThreats(baseCtx({ fatigueAccumulation: 36, daysSinceLastOutreach: 6 }));
    expect(t.length).toBeGreaterThan(0);
    for (const threat of t) {
      expect(threat.id).toBeTruthy();
      expect(threat.detectedAt).toBeTruthy();
      expect(threat.category).toBeTruthy();
      expect(threat.level).toBeTruthy();
      expect(threat.recommendation).toBeTruthy();
    }
  });

  it('rule failures do not crash evaluation (defensive)', () => {
    expect(() => evaluateThreats(baseCtx())).not.toThrow();
  });
});

describe('getOverallLevel', () => {
  it('returns nominal on empty', () => {
    expect(getOverallLevel([])).toBe('nominal');
  });

  it('returns highest level present', () => {
    const lvls: ThreatLevel[] = ['elevated', 'critical', 'high'];
    const fake = lvls.map((level, i) => ({
      id: `t${i}`, level, category: 'streak' as const,
      title: '', description: '', metric: '', recommendation: '', detectedAt: '',
    }));
    expect(getOverallLevel(fake)).toBe('critical');
  });
});
