import { QuestTemplate } from '@/types/questDifficulty';

// ── Types ────────────────────────────────────────────────────────────

export type RevenueImpact = 'direct' | 'supporting' | 'maintenance' | 'foundation' | 'none';

export interface RevenueScore {
  impact: RevenueImpact;
  score: number; // 0-100
  reason: string;
}

// ── Keyword-based scoring rules ──────────────────────────────────────

interface ScoringRule {
  impact: RevenueImpact;
  score: number;
  reason: string;
  match: (t: QuestTemplate) => boolean;
}

const SCORING_RULES: ScoringRule[] = [
  // DIRECT (80-100)
  {
    impact: 'direct',
    score: 100,
    reason: 'Discovery calls directly generate pipeline',
    match: t => t.id === 'tpl-discovery-call',
  },
  {
    impact: 'direct',
    score: 95,
    reason: 'Shipping deliverables closes revenue',
    match: t => t.id === 'tpl-ship-deliverable',
  },
  {
    impact: 'direct',
    score: 90,
    reason: 'Building automations is billable client work',
    match: t => t.id === 'tpl-build-automation',
  },
  {
    impact: 'direct',
    score: 85,
    reason: 'Warm lead follow-ups convert to revenue',
    match: t => t.id === 'tpl-follow-up-warm',
  },
  {
    impact: 'direct',
    score: 80,
    reason: 'Cold outreach fills the top of funnel',
    match: t => t.id === 'tpl-cold-call-5' || t.id === 'tpl-outreach-10',
  },

  // SUPPORTING (50-79)
  {
    impact: 'supporting',
    score: 70,
    reason: 'Long-form content creates social proof and inbound leads',
    match: t => t.id === 'tpl-publish-longform',
  },
  {
    impact: 'supporting',
    score: 65,
    reason: 'Optimizing existing automations increases client value',
    match: t => t.id === 'tpl-optimize-automation',
  },
  {
    impact: 'supporting',
    score: 60,
    reason: 'LinkedIn content drives inbound lead generation',
    match: t => t.id === 'tpl-linkedin-slay',
  },
  {
    impact: 'supporting',
    score: 55,
    reason: 'Deep work builds portfolio and product value',
    match: t => t.id === 'tpl-deep-work-augmentive' || t.id === 'tpl-second-wind',
  },
  {
    impact: 'supporting',
    score: 50,
    reason: 'Networking expands referral sources',
    match: t => t.id === 'tpl-engage-linkedin' || t.id === 'tpl-gratitude-text',
  },

  // MAINTENANCE (20-49)
  {
    impact: 'maintenance',
    score: 40,
    reason: 'Pipeline review keeps deals organized',
    match: t => t.id === 'tpl-review-pipeline',
  },
  {
    impact: 'maintenance',
    score: 35,
    reason: 'Financial tracking maintains business visibility',
    match: t => t.id === 'tpl-update-financials',
  },
  {
    impact: 'maintenance',
    score: 30,
    reason: 'Message management maintains relationships',
    match: t => t.id === 'tpl-respond-messages',
  },
  {
    impact: 'maintenance',
    score: 25,
    reason: 'Documentation supports business operations',
    match: t => t.id === 'tpl-document-process',
  },
  {
    impact: 'maintenance',
    score: 20,
    reason: 'Workspace organization reduces friction',
    match: t => t.id === 'tpl-organize' || t.id === 'tpl-review-calendar',
  },

  // FOUNDATION (5-19)
  {
    impact: 'foundation',
    score: 15,
    reason: 'Learning builds long-term capacity',
    match: t => t.category === 'Learning',
  },
  {
    impact: 'foundation',
    score: 10,
    reason: 'Physical health sustains output capacity',
    match: t => t.id === 'tpl-exercise-30' || t.id === 'tpl-cold-exposure',
  },
  {
    impact: 'foundation',
    score: 5,
    reason: 'Reflection builds self-awareness',
    match: t => t.id === 'tpl-journal-wins',
  },

  // NONE (0)
  {
    impact: 'none',
    score: 0,
    reason: 'Pure recovery — no revenue connection',
    match: t => ['tpl-breathing', 'tpl-hydrate', 'tpl-stretch', 'tpl-sprint-break', 'tpl-supplements', 'tpl-walk-15'].includes(t.id),
  },
];

// Fallback scoring by category
const CATEGORY_FALLBACK: Record<string, RevenueScore> = {
  Sales:      { impact: 'direct',      score: 80, reason: 'Sales category — direct revenue activity' },
  Network:    { impact: 'supporting',  score: 50, reason: 'Networking supports pipeline growth' },
  Systems:    { impact: 'supporting',  score: 55, reason: 'Systems work builds deliverable capacity' },
  Wealth:     { impact: 'maintenance', score: 35, reason: 'Wealth management maintains business health' },
  Creative:   { impact: 'supporting',  score: 50, reason: 'Creative output supports brand visibility' },
  Discipline: { impact: 'foundation',  score: 10, reason: 'Discipline is foundational to all output' },
  Health:     { impact: 'foundation',  score: 5,  reason: 'Health sustains capacity' },
  Learning:   { impact: 'foundation',  score: 15, reason: 'Learning builds long-term skills' },
};

const DEFAULT_SCORE: RevenueScore = { impact: 'none', score: 0, reason: 'Unclassified quest' };

// ── Public API ───────────────────────────────────────────────────────

export function scoreRevenueImpact(template: QuestTemplate): RevenueScore {
  for (const rule of SCORING_RULES) {
    if (rule.match(template)) {
      return { impact: rule.impact, score: rule.score, reason: rule.reason };
    }
  }
  return CATEGORY_FALLBACK[template.category] ?? DEFAULT_SCORE;
}

export function prioritizeByRevenue<T extends { id: string; baseXP: number }>(
  templates: T[],
  revenueWeight: number,
  scoreFn: (t: T) => RevenueScore = (t) => {
    // Default: look up in QUEST_TEMPLATES by id
    const rule = SCORING_RULES.find(r => r.match(t as unknown as QuestTemplate));
    return rule
      ? { impact: rule.impact, score: rule.score, reason: rule.reason }
      : DEFAULT_SCORE;
  },
): T[] {
  const scored = templates.map(t => {
    const rev = scoreFn(t);
    const finalPriority = (rev.score * revenueWeight) + (t.baseXP * (1 - revenueWeight));
    return { template: t, finalPriority };
  });

  scored.sort((a, b) => b.finalPriority - a.finalPriority);
  return scored.map(s => s.template);
}
