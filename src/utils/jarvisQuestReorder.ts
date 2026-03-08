// ── JARVIS Quest Reordering Engine ──────────────────────────────────
// Reorders calibrated quests based on:
// 1. AI anticipation data (optimalQuestOrder from system-intelligence)
// 2. Current COMT genetic phase (peak → high-cognition first, dip → execution first)
// 3. Peak/crash window proximity

import { CalibratedQuest } from '@/utils/questCalibration';
import { Anticipation } from '@/types/systemIntelligence';
import { PlayerStats } from '@/types/player';

// Maps quest stat categories to the AI's optimalQuestOrder labels
const STAT_TO_QUEST_TYPE: Record<keyof PlayerStats, string[]> = {
  discipline: ['health', 'discipline', 'habit', 'routine'],
  systems: ['systems', 'automation', 'ops', 'infrastructure'],
  sales: ['sales', 'revenue', 'outreach', 'client'],
  network: ['network', 'relationship', 'outreach', 'community'],
  wealth: ['wealth', 'finance', 'revenue', 'strategy'],
  creative: ['creative', 'content', 'learning', 'skill'],
};

// COMT phase → which stat categories should be prioritized
const PHASE_PRIORITY: Record<string, (keyof PlayerStats)[]> = {
  peak: ['systems', 'sales', 'wealth', 'network'], // High-cognition, high-leverage
  dip: ['discipline', 'creative'],                   // Low-cognition, execution/creative
  recovery: ['creative', 'discipline', 'network'],   // Strategic, social, creative
  stable: [],                                         // No override
};

/**
 * Reorder quests using JARVIS anticipation + genetic phase.
 * Non-destructive: returns a new array, never removes quests.
 */
export function reorderQuestsWithJarvis(
  quests: CalibratedQuest[],
  anticipation: Anticipation | null,
  geneticPhase: string | null,
): CalibratedQuest[] {
  if (quests.length <= 1) return quests;

  // Build a scoring map: questId → priority score (lower = earlier)
  const scores = new Map<string, number>();
  quests.forEach((q, i) => scores.set(q.id, i * 10)); // Base: preserve original order

  // ── Layer 1: AI optimal quest order ──
  if (anticipation?.today?.optimalQuestOrder?.length) {
    const order = anticipation.today.optimalQuestOrder.map(s => s.toLowerCase());

    for (const q of quests) {
      const questTypes = STAT_TO_QUEST_TYPE[q.stat] || [];
      const questCategory = q.category?.toLowerCase() || '';
      const questTitle = q.title?.toLowerCase() || '';

      // Find the best matching position in the AI's order
      let bestMatch = -1;
      for (let i = 0; i < order.length; i++) {
        const orderItem = order[i];
        if (
          questTypes.some(t => orderItem.includes(t)) ||
          orderItem.includes(questCategory) ||
          orderItem.includes(q.stat) ||
          questTitle.includes(orderItem)
        ) {
          bestMatch = i;
          break;
        }
      }

      if (bestMatch >= 0) {
        // AI-ordered quests get boosted (lower score = earlier)
        const current = scores.get(q.id) || 0;
        scores.set(q.id, current - (order.length - bestMatch) * 15);
      }
    }
  }

  // ── Layer 2: Genetic phase prioritization ──
  if (geneticPhase && PHASE_PRIORITY[geneticPhase]?.length) {
    const priorityStats = PHASE_PRIORITY[geneticPhase];

    for (const q of quests) {
      const phaseIndex = priorityStats.indexOf(q.stat);
      if (phaseIndex >= 0) {
        const current = scores.get(q.id) || 0;
        // Phase-matched quests get boosted proportional to priority
        scores.set(q.id, current - (priorityStats.length - phaseIndex) * 10);
      }
    }

    // During peak: boost higher-difficulty quests
    if (geneticPhase === 'peak') {
      const diffBonus: Record<string, number> = { S: -20, A: -12, B: -5, C: 0, D: 5 };
      for (const q of quests) {
        const current = scores.get(q.id) || 0;
        scores.set(q.id, current + (diffBonus[q.difficulty] ?? 0));
      }
    }

    // During dip: push high-difficulty quests later
    if (geneticPhase === 'dip') {
      const diffPenalty: Record<string, number> = { S: 20, A: 10, B: 0, C: -5, D: -10 };
      for (const q of quests) {
        const current = scores.get(q.id) || 0;
        scores.set(q.id, current + (diffPenalty[q.difficulty] ?? 0));
      }
    }
  }

  // ── Layer 3: Preserve mandatory/break positioning ──
  for (const q of quests) {
    if (q.isMandatory) {
      scores.set(q.id, (scores.get(q.id) || 0) - 50); // Mandatory always first
    }
    if (q.isBreak) {
      // Breaks stay roughly in position (no reorder)
      scores.set(q.id, (scores.get(q.id) || 0) + 100);
    }
  }

  // Sort by score (lower = earlier)
  return [...quests].sort((a, b) => (scores.get(a.id) || 0) - (scores.get(b.id) || 0));
}

/**
 * Get a human-readable reason for why quests were reordered.
 */
export function getReorderReason(
  anticipation: Anticipation | null,
  geneticPhase: string | null,
): string | null {
  if (!anticipation && !geneticPhase) return null;

  const parts: string[] = [];

  if (anticipation?.today?.optimalQuestOrder?.length) {
    parts.push('AI-optimized execution order');
  }

  if (geneticPhase === 'peak') {
    parts.push('high-leverage quests prioritized for peak window');
  } else if (geneticPhase === 'dip') {
    parts.push('execution tasks moved forward for crash window');
  } else if (geneticPhase === 'recovery') {
    parts.push('creative & strategic work prioritized for recovery phase');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
