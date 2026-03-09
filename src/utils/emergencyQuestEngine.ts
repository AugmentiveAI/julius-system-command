import { EmergencyContext, EmergencyQuest, EmergencyTriggerRule } from '@/types/emergencyQuest';

function getMidnightISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function getExpiresAt(minutesFromNow: number | null): string {
  if (minutesFromNow === null) return getMidnightISO();
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

export const EMERGENCY_RULES: EmergencyTriggerRule[] = [
  // ── THREAT-TRIGGERED ──────────────────────────────────────
  {
    id: 'streak_emergency',
    condition: (ctx) => ctx.hasCriticalStreakThreat && ctx.streak > 0,
    build: (ctx) => ({
      title: 'EMERGENCY: Streak Preservation',
      description: `Your ${ctx.streak}-day streak will reset at midnight. Complete this quest to save it.`,
      triggeredBy: 'streak',
      difficulty: 'A',
      xpReward: 50,
      statReward: { stat: 'discipline', amount: 2 },
      timeLimit: null,
      penalty: { type: 'streak_reset', amount: ctx.streak },
      objectives: [
        { id: 'streak-1', description: 'Complete any 1 quest before midnight', completed: false },
      ],
      isOpportunity: false,
    }),
  },
  {
    id: 'pipeline_emergency',
    condition: (ctx) => ctx.hasCriticalPipelineThreat,
    build: () => ({
      title: 'EMERGENCY: Pipeline Resuscitation',
      description: 'Pipeline is cold. Immediate outreach required.',
      triggeredBy: 'pipeline',
      difficulty: 'S',
      xpReward: 100,
      statReward: { stat: 'sales', amount: 3 },
      timeLimit: 120,
      penalty: { type: 'stat_loss', amount: 2, stat: 'sales' },
      objectives: [
        { id: 'pipe-1', description: 'Send 15 cold outreach messages', completed: false },
        { id: 'pipe-2', description: 'Update pipeline tracker', completed: false },
      ],
      isOpportunity: false,
    }),
  },
  {
    id: 'peak_emergency',
    condition: (ctx) =>
      ctx.geneticPhase === 'peak' &&
      ctx.currentHour === 11 &&
      ctx.deepWorkCompletedToday === 0,
    build: () => ({
      title: 'EMERGENCY: Peak Window Expiring',
      description: 'Final hour of cognitive peak. Use it or lose it.',
      triggeredBy: 'genetic',
      difficulty: 'A',
      xpReward: 75,
      statReward: { stat: 'systems', amount: 2 },
      timeLimit: 60,
      penalty: { type: 'xp_loss', amount: 25 },
      objectives: [
        { id: 'peak-1', description: 'Complete 1 deep work sprint (45 min)', completed: false },
      ],
      isOpportunity: false,
    }),
  },
  {
    id: 'penalty_prevention',
    condition: (ctx) =>
      ctx.consecutiveZeroDays === 1 &&
      ctx.currentHour >= 20 &&
      !ctx.penaltyDungeonActive,
    build: () => ({
      title: 'EMERGENCY: Penalty Prevention',
      description: 'Complete this to avoid Penalty Dungeon tomorrow.',
      triggeredBy: 'penalty',
      difficulty: 'A',
      xpReward: 60,
      statReward: { stat: 'discipline', amount: 2 },
      timeLimit: null,
      penalty: { type: 'stat_loss', amount: 3, stat: 'discipline' },
      objectives: [
        { id: 'pen-1', description: 'Complete 2 quests of any type', completed: false },
      ],
      isOpportunity: false,
    }),
  },

  // ── OPPORTUNITY-TRIGGERED (SURGES) ────────────────────────
  {
    id: 'momentum_surge',
    condition: (ctx) =>
      ctx.questsCompletedToday >= 4 &&
      ctx.lastQuestCompletedMinutesAgo < 10 &&
      !ctx.emergencyQuestActiveToday,
    build: () => ({
      title: 'SURGE: Momentum Capture',
      description: "You're on fire. Capitalize on this momentum.",
      triggeredBy: 'opportunity',
      difficulty: 'A',
      xpReward: 80,
      statReward: { stat: 'discipline', amount: 2 },
      timeLimit: 45,
      penalty: null,
      objectives: [
        { id: 'surge-1', description: 'Complete 2 more quests within 45 minutes', completed: false },
      ],
      isOpportunity: true,
    }),
  },
  {
    id: 'weekly_target_push',
    condition: (ctx) =>
      ctx.dayOfWeek === 0 && // Sunday
      ctx.weeklyXP >= ctx.weeklyTargetXP * 0.8 &&
      ctx.weeklyXP < ctx.weeklyTargetXP,
    build: (ctx) => ({
      title: 'SURGE: Weekly Target Push',
      description: "You're 80% to weekly target. Push to 100%.",
      triggeredBy: 'opportunity',
      difficulty: 'S',
      xpReward: 100,
      statReward: { stat: 'discipline', amount: 3 },
      timeLimit: null,
      penalty: null,
      objectives: [
        { id: 'weekly-1', description: `Earn ${ctx.weeklyTargetXP - ctx.weeklyXP} more XP today`, completed: false },
      ],
      isOpportunity: true,
    }),
  },
];

export function evaluateEmergencyTriggers(ctx: EmergencyContext): EmergencyQuest | null {
  // Max 2 emergencies per day
  if (ctx.emergencyCountToday >= 2) return null;
  // Don't trigger if one is already active
  if (ctx.emergencyQuestActiveToday) return null;

  for (const rule of EMERGENCY_RULES) {
    try {
      if (rule.condition(ctx)) {
        const questData = rule.build(ctx);
        const now = new Date().toISOString();
        return {
          id: `emergency-${rule.id}-${Date.now()}`,
          ...questData,
          status: 'pending',
          triggeredAt: now,
          expiresAt: getExpiresAt(questData.timeLimit),
        };
      }
    } catch { /* skip broken rule */ }
  }

  return null;
}
