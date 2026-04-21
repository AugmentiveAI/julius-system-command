import { describe, it, expect } from 'vitest';
import {
  getGeneticState,
  getGeneticXPMultiplier,
  getGeneticQuestFilter,
  type COMTPhase,
  type ACTN3Status,
} from '@/utils/geneticEngine';

/**
 * PR1c — engine behavior lock for geneticEngine.
 * Goal: pin INVARIANTS the brain slicing must preserve (phase classification,
 * XP multiplier monotonicity, S-rank lockout). Avoid pinning narrative copy.
 */

const at = (hour: number) => {
  const d = new Date('2025-01-15T00:00:00Z'); // Wed (work day)
  d.setHours(hour, 0, 0, 0);
  return d;
};

describe('getGeneticState — COMT phase classification', () => {
  const cases: Array<{ hour: number; stress: 1 | 2 | 3 | 4 | 5; expected: COMTPhase; label: string }> = [
    { hour: 5, stress: 2, expected: 'recovery', label: 'pre-dawn' },
    { hour: 7, stress: 2, expected: 'stable', label: 'early morning' },
    { hour: 9, stress: 2, expected: 'peak', label: 'morning peak' },
    { hour: 11, stress: 3, expected: 'peak', label: 'late peak window' },
    { hour: 13, stress: 2, expected: 'stable', label: 'lunch window' },
    { hour: 15, stress: 2, expected: 'dip', label: 'afternoon dip' },
    { hour: 19, stress: 2, expected: 'recovery', label: 'evening' },
    { hour: 9, stress: 5, expected: 'dip', label: 'stress override beats peak' },
    { hour: 9, stress: 4, expected: 'stable', label: 'stress 4 disqualifies peak' },
  ];

  it.each(cases)('hour=$hour stress=$stress → $expected ($label)', ({ hour, stress, expected }) => {
    const state = getGeneticState(at(hour), null, null, 0, stress);
    expect(state.comtPhase).toBe(expected);
  });

  it('cold exposure within 2h flips dip → recovery', () => {
    const now = at(15);
    const cold = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
    const state = getGeneticState(now, cold, null, 0, 2);
    expect(state.comtPhase).toBe('recovery');
  });

  it('magnesium within 3h flips dip → recovery', () => {
    const now = at(15);
    const mag = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
    const state = getGeneticState(now, null, mag, 0, 2);
    expect(state.comtPhase).toBe('recovery');
  });

  it('stale cold (>2h) does NOT mitigate dip', () => {
    const now = at(15);
    const cold = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const state = getGeneticState(now, cold, null, 0, 2);
    expect(state.comtPhase).toBe('dip');
  });
});

describe('getGeneticState — ACTN3 sprint status', () => {
  const cases: Array<{ sprints: number; expected: ACTN3Status }> = [
    { sprints: 0, expected: 'fresh' },
    { sprints: 1, expected: 'fresh' },
    { sprints: 2, expected: 'active' },
    { sprints: 3, expected: 'active' },
    { sprints: 4, expected: 'fatigued' },
    { sprints: 5, expected: 'depleted' },
    { sprints: 99, expected: 'depleted' },
  ];

  it.each(cases)('sprints=$sprints → $expected', ({ sprints, expected }) => {
    const state = getGeneticState(at(9), null, null, sprints, 2);
    expect(state.actn3Status).toBe(expected);
  });

  it('peak phase always emits at least one buff', () => {
    const state = getGeneticState(at(9), null, null, 0, 2);
    expect(state.comtPhase).toBe('peak');
    expect(state.activeBuffs.length).toBeGreaterThan(0);
  });

  it('depleted ACTN3 always emits a debuff', () => {
    const state = getGeneticState(at(9), null, null, 5, 2);
    expect(state.activeDebuffs.some(d => d.name === 'Sprint Burnout')).toBe(true);
  });
});

describe('getGeneticXPMultiplier — monotonicity', () => {
  it('peak gives ≥1x for any difficulty', () => {
    const peak = getGeneticState(at(9), null, null, 0, 2);
    for (const diff of ['S', 'A', 'B', 'C', 'D'] as const) {
      expect(getGeneticXPMultiplier(peak, diff, false)).toBeGreaterThanOrEqual(1);
    }
  });

  it('dip penalises S-rank only (≤1x for S, =1x for non-S non-sprint)', () => {
    const dip = getGeneticState(at(15), null, null, 0, 2);
    expect(getGeneticXPMultiplier(dip, 'S', false)).toBeLessThan(1);
    expect(getGeneticXPMultiplier(dip, 'A', false)).toBe(1);
    expect(getGeneticXPMultiplier(dip, 'B', false)).toBe(1);
  });

  it('fresh sprint > active sprint > fatigued sprint > depleted sprint', () => {
    const fresh = getGeneticXPMultiplier(getGeneticState(at(9), null, null, 0, 2), 'B', true);
    const active = getGeneticXPMultiplier(getGeneticState(at(9), null, null, 2, 2), 'B', true);
    const fatigued = getGeneticXPMultiplier(getGeneticState(at(9), null, null, 4, 2), 'B', true);
    const depleted = getGeneticXPMultiplier(getGeneticState(at(9), null, null, 5, 2), 'B', true);

    expect(fresh).toBeGreaterThan(active);
    expect(active).toBeGreaterThanOrEqual(fatigued);
    expect(fatigued).toBeGreaterThan(depleted);
  });

  it('returns clean 2-decimal numbers (no float drift)', () => {
    const m = getGeneticXPMultiplier(getGeneticState(at(9), null, null, 0, 2), 'S', true);
    expect(Number.isFinite(m)).toBe(true);
    expect(m * 100).toBeCloseTo(Math.round(m * 100), 5);
  });
});

describe('getGeneticQuestFilter — S-rank lockouts', () => {
  it('depleted ACTN3 locks S-rank with sprint reason', () => {
    const state = getGeneticState(at(9), null, null, 5, 2);
    const f = getGeneticQuestFilter(state);
    expect(f.allowedDifficulties).not.toContain('S');
    expect(f.lockedReason).toMatch(/sprint/i);
  });

  it('COMT dip locks S-rank with dopamine reason', () => {
    const state = getGeneticState(at(15), null, null, 0, 2);
    const f = getGeneticQuestFilter(state);
    expect(f.allowedDifficulties).not.toContain('S');
    expect(f.lockedReason).toMatch(/dopamine|dip/i);
  });

  it('peak phase allows all difficulties', () => {
    const state = getGeneticState(at(9), null, null, 0, 2);
    const f = getGeneticQuestFilter(state);
    expect(f.allowedDifficulties).toEqual(['S', 'A', 'B', 'C', 'D']);
    expect(f.lockedReason).toBeNull();
  });

  it('recovery without Second Wind locks S-rank', () => {
    const state = getGeneticState(at(19), null, null, 0, 2);
    const f = getGeneticQuestFilter(state);
    expect(f.allowedDifficulties).not.toContain('S');
  });
});
