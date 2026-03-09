import { Threat, ThreatContext, ThreatLevel, THREAT_LEVEL_PRIORITY } from '@/types/threat';

interface ThreatRule {
  id: string;
  condition: (ctx: ThreatContext) => boolean;
  build: (ctx: ThreatContext) => Omit<Threat, 'id' | 'detectedAt'>;
}

const THREAT_RULES: ThreatRule[] = [
  // ── STREAK ─────────────────────────────────────────
  {
    id: 'streak_warning',
    condition: (ctx) => ctx.currentHour >= 18 && ctx.currentHour < 21 && ctx.questsCompletedToday === 0 && ctx.streak > 0,
    build: (ctx) => ({
      category: 'streak',
      level: 'elevated',
      title: 'Streak at Risk',
      description: 'No quests completed today.',
      metric: `${24 - ctx.currentHour} hours until reset`,
      recommendation: 'Complete any quest to preserve streak.',
    }),
  },
  {
    id: 'streak_critical',
    condition: (ctx) => ctx.currentHour >= 21 && ctx.questsCompletedToday === 0 && ctx.streak > 0,
    build: (ctx) => ({
      category: 'streak',
      level: 'critical',
      title: 'STREAK CRITICAL',
      description: `${ctx.streak}-day streak will reset at midnight.`,
      metric: `${24 - ctx.currentHour} hours remaining`,
      recommendation: 'Immediate action required.',
    }),
  },

  // ── FATIGUE ────────────────────────────────────────
  {
    id: 'fatigue_elevated',
    condition: (ctx) => ctx.fatigueAccumulation >= 28 && ctx.fatigueAccumulation < 35,
    build: (ctx) => ({
      category: 'fatigue',
      level: 'elevated',
      title: 'Fatigue Accumulating',
      description: 'Recovery deficit building.',
      metric: `Fatigue: ${ctx.fatigueAccumulation}/40`,
      recommendation: 'Consider reducing intensity or scheduling rest.',
    }),
  },
  {
    id: 'fatigue_high',
    condition: (ctx) => ctx.fatigueAccumulation >= 35,
    build: (ctx) => ({
      category: 'fatigue',
      level: 'high',
      title: 'Overtraining Risk',
      description: 'Fatigue at critical levels.',
      metric: `Fatigue: ${ctx.fatigueAccumulation}/40`,
      recommendation: 'Deload protocol recommended.',
    }),
  },

  // ── PIPELINE ───────────────────────────────────────
  {
    id: 'pipeline_warning',
    condition: (ctx) => ctx.daysSinceLastOutreach >= 3 && ctx.daysSinceLastOutreach < 5,
    build: (ctx) => ({
      category: 'pipeline',
      level: 'elevated',
      title: 'Pipeline Cooling',
      description: 'No outreach activity detected.',
      metric: `${ctx.daysSinceLastOutreach} days since last outreach`,
      recommendation: 'Send outreach today to maintain pipeline temperature.',
    }),
  },
  {
    id: 'pipeline_critical',
    condition: (ctx) => ctx.daysSinceLastOutreach >= 5,
    build: (ctx) => ({
      category: 'pipeline',
      level: 'critical',
      title: 'PIPELINE COLD',
      description: 'Extended outreach gap detected.',
      metric: `${ctx.daysSinceLastOutreach} days without outreach`,
      recommendation: 'Immediate outreach required. Pipeline is dying.',
    }),
  },

  // ── GENETIC ────────────────────────────────────────
  {
    id: 'genetic_crash_active',
    condition: (ctx) => ctx.geneticPhase === 'dip' && ctx.attemptingHighCognitionTask,
    build: () => ({
      category: 'genetic',
      level: 'high',
      title: 'Crash Window Active',
      description: 'Attempting cognitive work during COMT crash.',
      metric: 'Performance reduced ~40%',
      recommendation: 'Switch to physical tasks or admin work.',
    }),
  },
  {
    id: 'genetic_peak_wasted',
    condition: (ctx) => ctx.geneticPhase === 'peak' && ctx.currentHour >= 11 && ctx.deepWorkCompletedToday === 0,
    build: (ctx) => ({
      category: 'genetic',
      level: 'high',
      title: 'Peak Window Closing',
      description: 'No deep work during cognitive peak.',
      metric: `${Math.max(0, 12 - ctx.currentHour)} hour(s) of peak remaining`,
      recommendation: 'Execute highest-leverage cognitive task NOW.',
    }),
  },

  // ── MOMENTUM ───────────────────────────────────────
  {
    id: 'momentum_stall',
    condition: (ctx) => ctx.questsCompletedLast3Days < 5 && ctx.streak === 0,
    build: (ctx) => ({
      category: 'momentum',
      level: 'elevated',
      title: 'Momentum Stalled',
      description: 'Low activity detected over multiple days.',
      metric: `${ctx.questsCompletedLast3Days} quests in 3 days`,
      recommendation: 'Complete 3 quests today to rebuild momentum.',
    }),
  },

  // ── PENALTY ────────────────────────────────────────
  {
    id: 'penalty_imminent',
    condition: (ctx) => ctx.consecutiveZeroDays === 1 && !ctx.penaltyDungeonActive,
    build: () => ({
      category: 'penalty',
      level: 'high',
      title: 'Penalty Warning',
      description: 'One more zero day triggers Penalty Dungeon.',
      metric: '1 day until penalty',
      recommendation: 'Complete at least 1 quest today.',
    }),
  },
  {
    id: 'penalty_active',
    condition: (ctx) => ctx.penaltyDungeonActive,
    build: (ctx) => ({
      category: 'penalty',
      level: 'critical',
      title: 'PENALTY DUNGEON ACTIVE',
      description: 'Mandatory penalty quest in progress.',
      metric: ctx.penaltyTimeRemaining || 'Time running',
      recommendation: 'Complete penalty objectives to avoid stat loss.',
    }),
  },

  // ── DEADLINE ───────────────────────────────────────
  {
    id: 'deadline_approaching',
    condition: (ctx) => ctx.daysToExitDeadline > 0 && ctx.daysToExitDeadline <= 30,
    build: (ctx) => ({
      category: 'deadline',
      level: ctx.daysToExitDeadline <= 14 ? 'critical' : 'high',
      title: 'Exit Deadline Approaching',
      description: `${ctx.daysToExitDeadline} days to target.`,
      metric: `$${ctx.currentMRR}/$${ctx.targetMRR} MRR`,
      recommendation: 'Increase revenue-generating activities.',
    }),
  },

  // ── CORNERSTONE ────────────────────────────────────
  {
    id: 'cornerstone_at_risk',
    condition: (ctx) => {
      if (!(ctx as any).cornerstoneAtRisk) return false;
      const hour = new Date().getHours();
      return hour >= 10;
    },
    build: (ctx) => ({
      category: 'momentum',
      level: new Date().getHours() >= 14 ? 'high' : 'elevated',
      title: 'Cornerstone at Risk',
      description: `Keystone behavior not yet completed today.`,
      metric: `${(ctx as any).cornerstoneCorrelation || 0}% of good days have this`,
      recommendation: 'Protect the cornerstone immediately.',
    }),
  },
];

export function evaluateThreats(ctx: ThreatContext): Threat[] {
  const now = new Date().toISOString();
  return THREAT_RULES
    .filter((rule) => {
      try { return rule.condition(ctx); } catch { return false; }
    })
    .map((rule) => ({
      id: rule.id,
      detectedAt: now,
      ...rule.build(ctx),
    }));
}

export function getOverallLevel(threats: Threat[]): ThreatLevel {
  if (threats.length === 0) return 'nominal';
  return threats.reduce<ThreatLevel>((highest, t) =>
    THREAT_LEVEL_PRIORITY[t.level] > THREAT_LEVEL_PRIORITY[highest] ? t.level : highest,
    'nominal'
  );
}
