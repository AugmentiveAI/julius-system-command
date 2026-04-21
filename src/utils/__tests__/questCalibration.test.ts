import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calibrateQuests, type QuestCompletionRecord } from '@/utils/questCalibration';
import type { PlayerStateCheck } from '@/types/playerState';

/**
 * PR1c — engine behavior lock for questCalibration.
 * Strategy: lock high-level invariants only (intensity mapping, mode→quest count
 * shape, mandatory injection). Internal selection is randomised, so we seed
 * Math.random for determinism inside each test.
 */

const seedRandom = (seed = 0.42) => {
  vi.spyOn(Math, 'random').mockReturnValue(seed);
};

const buildState = (over: Partial<PlayerStateCheck> = {}): PlayerStateCheck => ({
  id: 'state-1',
  timestamp: new Date('2025-01-15T09:00:00Z'),
  energy: 4,
  focus: 4,
  mood: 4,
  stress: 2,
  compositeScore: 4,
  dayType: 'work',
  timeBlock: 'morning',
  systemRecommendation: 'push',
  ...over,
});

beforeEach(() => seedRandom());
afterEach(() => vi.restoreAllMocks());

describe('calibrateQuests — intensity mapping', () => {
  it('push mode → high intensity', () => {
    const r = calibrateQuests(buildState({ systemRecommendation: 'push' }), [], [], new Date('2025-01-15T09:00:00Z'));
    expect(r.intensity).toBe('high');
  });
  it('steady mode → medium intensity', () => {
    const r = calibrateQuests(buildState({ systemRecommendation: 'steady' }), [], [], new Date('2025-01-15T09:00:00Z'));
    expect(r.intensity).toBe('medium');
  });
  it('recover mode → low intensity', () => {
    const r = calibrateQuests(buildState({ systemRecommendation: 'recover' }), [], [], new Date('2025-01-15T09:00:00Z'));
    expect(r.intensity).toBe('low');
  });
});

describe('calibrateQuests — quest list invariants', () => {
  it('always returns at least one quest in any mode', () => {
    for (const mode of ['push', 'steady', 'recover'] as const) {
      const r = calibrateQuests(buildState({ systemRecommendation: mode }), [], [], new Date('2025-01-15T09:00:00Z'));
      expect(r.recommendedQuests.length).toBeGreaterThan(0);
    }
  });

  it('all quests have a positive adjustedXP', () => {
    const r = calibrateQuests(buildState(), [], [], new Date('2025-01-15T09:00:00Z'));
    for (const q of r.recommendedQuests) {
      expect(q.adjustedXP).toBeGreaterThan(0);
    }
  });

  it('quest IDs are unique within a calibration result (modulo break duplication)', () => {
    const r = calibrateQuests(buildState(), [], [], new Date('2025-01-15T09:00:00Z'));
    const non‌Break = r.recommendedQuests.filter(q => !q.isBreak);
    const ids = non‌Break.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns a systemMessage string', () => {
    const r = calibrateQuests(buildState(), [], [], new Date('2025-01-15T09:00:00Z'));
    expect(typeof r.systemMessage).toBe('string');
    expect(r.systemMessage.length).toBeGreaterThan(0);
  });
});

describe('calibrateQuests — recovery escalation', () => {
  it('emits escalation message after 3+ consecutive recovery days', () => {
    const recoveryDay = (i: number): PlayerStateCheck => buildState({
      id: `s-${i}`,
      timestamp: new Date(`2025-01-${10 + i}T09:00:00Z`),
      systemRecommendation: 'recover',
    });
    const history = [recoveryDay(0), recoveryDay(1), recoveryDay(2)];
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'recover' }),
      history,
      [],
      new Date('2025-01-15T09:00:00Z'),
    );
    expect(r.systemMessage).toMatch(/WARNING|push past/i);
  });
});

describe('calibrateQuests — mandatory injection', () => {
  it('stress=5 in recovery mode injects a mandatory quest', () => {
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'recover', stress: 5 }),
      [],
      [],
      new Date('2025-01-15T09:00:00Z'),
    );
    expect(r.recommendedQuests.some(q => q.isMandatory)).toBe(true);
  });

  it('stress<5 in recovery does not inject mandatory quest', () => {
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'recover', stress: 3 }),
      [],
      [],
      new Date('2025-01-15T09:00:00Z'),
    );
    expect(r.recommendedQuests.some(q => q.isMandatory)).toBe(false);
  });
});

describe('calibrateQuests — genetic alerts', () => {
  it('COMT peak window emits geneticAlert with bonus phrasing', () => {
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'push' }),
      [],
      [],
      new Date('2025-01-15T09:00:00Z'), // 9am = peak
    );
    expect(r.geneticAlert).toMatch(/peak|bonus/i);
  });

  it('no genetic alert during stable hours', () => {
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'steady', timeBlock: 'morning' }),
      [],
      [],
      new Date('2025-01-15T07:00:00Z'),
    );
    expect(r.geneticAlert).toBeNull();
  });

  it('4+ sprints today filter out sprint quests', () => {
    const completions: QuestCompletionRecord[] = Array.from({ length: 5 }).map((_, i) => ({
      questId: `c-${i}`,
      completedAt: '2025-01-15T08:00:00Z',
      stat: 'sales',
    }));
    const r = calibrateQuests(
      buildState({ systemRecommendation: 'push' }),
      [],
      completions,
      new Date('2025-01-15T09:00:00Z'),
    );
    expect(r.recommendedQuests.every(q => q.sprintCount === 0)).toBe(true);
    expect(r.geneticAlert).toMatch(/sprint/i);
  });
});
