import { useMemo } from 'react';
import { FeedItem } from '@/types/systemFeed';
import { SystemStrategy } from '@/utils/systemIntelligence';

interface FeedBuilderArgs {
  strategy: SystemStrategy;
  intelligence: any | null;
  highestPriority: any | null;
  cornerstone: any | null;
  todayHonored: boolean;
  newLoopDetected: any | null;
  penaltyLevel: number;
  questChains: any[];
  levelUpSkill: any | null;
  shadows: any[];
  geneticPhase: string | null;
}

/**
 * Builds a unified feed of system notifications from all intelligence sources.
 * The System decides what's worth showing — the user never has to dig.
 */
export function useSystemFeed({
  strategy, intelligence, highestPriority, cornerstone, todayHonored,
  newLoopDetected, penaltyLevel, questChains, levelUpSkill, shadows, geneticPhase,
}: FeedBuilderArgs): { heroItem: FeedItem | null; feedItems: FeedItem[] } {
  return useMemo(() => {
    const now = new Date().toISOString();
    const items: FeedItem[] = [];

    // ── Critical items (hero candidates) ──

    // Penalty
    if (penaltyLevel >= 2) {
      items.push({
        id: 'penalty',
        type: 'penalty',
        title: 'Penalty Active',
        body: `Penalty level ${penaltyLevel}. Zero-day streak active. Complete any mission to halt stat decay.`,
        priority: 'critical',
        timestamp: now,
        action: { label: 'View Missions', handler: 'expand_missions' },
      });
    }

    // System intervention
    if (highestPriority) {
      items.push({
        id: 'intervention',
        type: highestPriority.priority === 'critical' ? 'warning' : 'directive',
        title: 'System Intervention',
        body: highestPriority.message,
        priority: highestPriority.priority === 'critical' ? 'critical' : highestPriority.priority === 'high' ? 'high' : 'medium',
        timestamp: now,
      });
    }

    // Cornerstone unprotected
    if (cornerstone && !todayHonored) {
      items.push({
        id: 'cornerstone',
        type: 'warning',
        title: 'Cornerstone Unprotected',
        body: `"${cornerstone.behavior}" not honored today. History predicts low-output day without it.`,
        priority: 'high',
        timestamp: now,
      });
    }

    // ── Insights ──

    // Daily brief
    const briefText = intelligence?.dailyBrief || strategy.dailyBrief?.split(/[.!]/).filter(Boolean)[0]?.trim();
    if (briefText) {
      items.push({
        id: 'daily-brief',
        type: 'insight',
        title: 'Daily Brief',
        body: briefText,
        priority: 'medium',
        timestamp: now,
      });
    }

    // Predictions
    if (intelligence?.predictions?.length > 0) {
      intelligence.predictions.forEach((pred: string, i: number) => {
        items.push({
          id: `prediction-${i}`,
          type: 'insight',
          title: 'Prediction',
          body: pred,
          priority: 'low',
          timestamp: now,
        });
      });
    } else if (strategy.predictions?.length > 0) {
      items.push({
        id: 'prediction-0',
        type: 'insight',
        title: 'Forecast',
        body: strategy.predictions[0],
        priority: 'low',
        timestamp: now,
      });
    }

    // ── Warnings ──

    if (strategy.warnings) {
      strategy.warnings.forEach((w, i) => {
        items.push({
          id: `warning-${i}`,
          type: 'warning',
          title: 'System Warning',
          body: w.message,
          priority: w.level === 'critical' ? 'critical' : w.level === 'caution' ? 'high' : 'medium',
          timestamp: now,
        });
      });
    }

    // Loop detected
    if (newLoopDetected) {
      items.push({
        id: 'loop-detected',
        type: 'warning',
        title: 'Pattern Loop',
        body: `Pattern detected: ${newLoopDetected.pattern}. ${newLoopDetected.breakStrategy || 'Analyze and adapt.'}`,
        priority: 'high',
        timestamp: now,
      });
    }

    // ── Milestones ──

    if (levelUpSkill) {
      items.push({
        id: 'skill-levelup',
        type: 'milestone',
        title: 'Mastery Level Up',
        body: `${levelUpSkill.name} → Level ${levelUpSkill.newLevel}. The System acknowledges your growth.`,
        priority: 'medium',
        timestamp: now,
      });
    }

    // Chain progress
    questChains.forEach(chain => {
      if (chain.status === 'active') {
        const pct = Math.round((chain.currentStep / chain.totalSteps) * 100);
        items.push({
          id: `chain-${chain.id}`,
          type: 'milestone',
          title: chain.title,
          body: `Step ${chain.currentStep}/${chain.totalSteps} (${pct}%). Continue the chain.`,
          priority: 'low',
          timestamp: chain.started_at || now,
          action: { label: 'Complete Next Step', handler: `chain:${chain.id}` },
        });
      }
    });

    // ── System Status ──

    if (geneticPhase === 'peak') {
      items.push({
        id: 'comt-peak',
        type: 'system_status',
        title: 'Peak Window',
        body: 'COMT peak window ACTIVE. Maximum cognitive output available. Push hard now.',
        priority: 'medium',
        timestamp: now,
      });
    } else if (geneticPhase === 'dip') {
      items.push({
        id: 'comt-dip',
        type: 'system_status',
        title: 'COMT Dip',
        body: 'Dopamine dip detected. The System has reduced expectations. Recovery-focused tasks recommended.',
        priority: 'low',
        timestamp: now,
      });
    }

    // ── Shadow Intel ──

    if (intelligence?.suggestedShadows?.length > 0) {
      intelligence.suggestedShadows.forEach((s: any, i: number) => {
        items.push({
          id: `shadow-suggestion-${i}`,
          type: 'shadow_intel',
          title: s.name,
          body: s.description || `New shadow agent identified: ${s.name} (${s.category}).`,
          priority: 'low',
          timestamp: now,
          action: { label: 'Deploy Shadow', handler: `shadow:${i}` },
        });
      });
    }

    // ── Tactics ──

    if (intelligence?.suggestedDungeons?.length > 0) {
      intelligence.suggestedDungeons.forEach((d: any, i: number) => {
        items.push({
          id: `dungeon-suggestion-${i}`,
          type: 'tactic',
          title: d.title,
          body: d.description || `New challenge available: ${d.title} (${d.difficulty}-Rank).`,
          priority: 'low',
          timestamp: now,
          action: { label: 'Enter Dungeon', handler: `dungeon:${i}` },
        });
      });
    }

    // XP modifiers as system status
    const significantMods = strategy.xpModifiers?.filter(m => m.multiplier >= 1.15 || m.multiplier <= 0.8) ?? [];
    significantMods.forEach((mod, i) => {
      items.push({
        id: `xp-mod-${i}`,
        type: 'system_status',
        title: mod.source,
        body: mod.reason,
        priority: 'low',
        timestamp: now,
      });
    });

    // ── Sort by priority, then dedup hero ──

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Hero = highest priority item
    const heroItem = items[0] ?? null;
    const feedItems = items.slice(1);

    return { heroItem, feedItems };
  }, [strategy, intelligence, highestPriority, cornerstone, todayHonored, newLoopDetected, penaltyLevel, questChains, levelUpSkill, shadows, geneticPhase]);
}
