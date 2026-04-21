import { describe, it, expect } from 'vitest';
import { reorderQuestsWithJarvis, getReorderReason } from '@/utils/jarvisQuestReorder';
import type { CalibratedQuest } from '@/utils/questCalibration';
import type { Anticipation } from '@/types/systemIntelligence';

/**
 * PR1c — engine behavior lock for jarvisQuestReorder.
 * Invariants: never destructive, mandatory-first, breaks-stay-late, phase priority works.
 */

const q = (over: Partial<CalibratedQuest> & { id: string }): CalibratedQuest => ({
  id: over.id,
  title: over.title ?? `Quest ${over.id}`,
  stat: over.stat ?? 'creative',
  baseXP: over.baseXP ?? 100,
  adjustedXP: over.adjustedXP ?? 100,
  difficulty: over.difficulty ?? 'B',
  category: over.category ?? 'Creative',
  estimatedMinutes: over.estimatedMinutes ?? 30,
  sprintCount: over.sprintCount ?? 0,
  isBonus: over.isBonus,
  isMandatory: over.isMandatory,
  isBreak: over.isBreak,
  geneticTag: over.geneticTag,
});

describe('reorderQuestsWithJarvis — invariants', () => {
  it('returns quests unchanged when length ≤ 1', () => {
    const single = [q({ id: 'a' })];
    expect(reorderQuestsWithJarvis(single, null, null)).toEqual(single);
    expect(reorderQuestsWithJarvis([], null, null)).toEqual([]);
  });

  it('NEVER drops or duplicates quests (length + ID set preserved)', () => {
    const quests = [
      q({ id: 'a', stat: 'sales', difficulty: 'S' }),
      q({ id: 'b', stat: 'creative', difficulty: 'D' }),
      q({ id: 'c', stat: 'systems', difficulty: 'A' }),
      q({ id: 'd', stat: 'discipline', difficulty: 'C' }),
    ];
    const out = reorderQuestsWithJarvis(quests, null, 'peak');
    expect(out).toHaveLength(quests.length);
    expect(new Set(out.map(o => o.id))).toEqual(new Set(quests.map(o => o.id)));
  });

  it('does not mutate the input array', () => {
    const quests = [q({ id: 'a' }), q({ id: 'b' })];
    const snapshot = quests.map(x => x.id);
    reorderQuestsWithJarvis(quests, null, 'peak');
    expect(quests.map(x => x.id)).toEqual(snapshot);
  });

  it('mandatory quests sort first', () => {
    const quests = [
      q({ id: 'a' }),
      q({ id: 'b' }),
      q({ id: 'mandatory', isMandatory: true }),
    ];
    const out = reorderQuestsWithJarvis(quests, null, 'stable');
    expect(out[0].id).toBe('mandatory');
  });

  it('break quests sort late even with priority phase', () => {
    const quests = [
      q({ id: 'sales', stat: 'sales', difficulty: 'S' }),
      q({ id: 'break', isBreak: true }),
      q({ id: 'creative', stat: 'creative', difficulty: 'D' }),
    ];
    const out = reorderQuestsWithJarvis(quests, null, 'peak');
    expect(out[out.length - 1].id).toBe('break');
  });
});

describe('reorderQuestsWithJarvis — phase priority', () => {
  it('peak phase boosts S-rank high-leverage stats above D-rank low-leverage', () => {
    const quests = [
      q({ id: 'low', stat: 'creative', difficulty: 'D' }),
      q({ id: 'high', stat: 'sales', difficulty: 'S' }),
    ];
    const out = reorderQuestsWithJarvis(quests, null, 'peak');
    expect(out.findIndex(o => o.id === 'high')).toBeLessThan(out.findIndex(o => o.id === 'low'));
  });

  it('dip phase pushes S-rank later than D-rank', () => {
    const quests = [
      q({ id: 'hard', stat: 'sales', difficulty: 'S' }),
      q({ id: 'easy', stat: 'discipline', difficulty: 'D' }),
    ];
    const out = reorderQuestsWithJarvis(quests, null, 'dip');
    expect(out.findIndex(o => o.id === 'easy')).toBeLessThan(out.findIndex(o => o.id === 'hard'));
  });

  it('stable phase + no anticipation preserves original order', () => {
    const quests = [q({ id: 'a' }), q({ id: 'b' }), q({ id: 'c' })];
    const out = reorderQuestsWithJarvis(quests, null, 'stable');
    expect(out.map(o => o.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('reorderQuestsWithJarvis — anticipation layer', () => {
  it('AI optimal order influences ranking when matches found', () => {
    const anticipation: Anticipation = {
      today: { optimalQuestOrder: ['sales', 'creative'] },
    } as Anticipation;

    const quests = [
      q({ id: 'creative-q', stat: 'creative', difficulty: 'B' }),
      q({ id: 'sales-q', stat: 'sales', difficulty: 'B' }),
    ];
    const out = reorderQuestsWithJarvis(quests, anticipation, null);
    expect(out[0].id).toBe('sales-q');
  });

  it('empty anticipation order is a no-op', () => {
    const quests = [q({ id: 'a' }), q({ id: 'b' })];
    const anticipation = { today: { optimalQuestOrder: [] } } as unknown as Anticipation;
    const out = reorderQuestsWithJarvis(quests, anticipation, null);
    expect(out.map(o => o.id)).toEqual(['a', 'b']);
  });
});

describe('getReorderReason', () => {
  it('returns null when no signals', () => {
    expect(getReorderReason(null, null)).toBeNull();
  });
  it('describes peak phase', () => {
    expect(getReorderReason(null, 'peak')).toMatch(/peak/i);
  });
  it('describes dip phase', () => {
    expect(getReorderReason(null, 'dip')).toMatch(/crash|execution/i);
  });
  it('mentions AI when anticipation order present', () => {
    const a = { today: { optimalQuestOrder: ['sales'] } } as Anticipation;
    expect(getReorderReason(a, null)).toMatch(/ai/i);
  });
});
