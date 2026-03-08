// ── Intervention Engine — Proactive JARVIS-level intelligence ─────────

export type InterventionType =
  | 'opportunity_window'
  | 'risk_alert'
  | 'pattern_insight'
  | 'strategic_pivot'
  | 'momentum_capture'
  | 'recovery_mandate'
  | 'genetic_optimization'
  | 'accountability_check'
  | 'celebration';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SystemIntervention {
  id: string;
  type: InterventionType;
  priority: InterventionPriority;
  title: string;
  message: string;
  action?: {
    label: string;
    route?: string;
    callback?: string;
  };
  expires_at?: string;
  dismissed: boolean;
  created_at: string;
}

export interface InterventionContext {
  currentHour: number;
  geneticPhase: string;
  questsCompletedToday: number;
  questsTotalToday: number;
  xpEarnedToday: number;
  averageDailyXP: number;
  streak: number;
  lastCaffeineTime: string | null;
  caffeineWarningShownToday: boolean;
  fatigueAccumulation: number;
  workoutScheduledToday: boolean;
  dayOfWeek: number; // 0=Sun
  weeklyPlanCompleted: boolean;
  daysSinceLastShadowActivation: number;
  lastQuestCompletedMinutesAgo: number;
  trainingCompleted: boolean;
  sprintsToday: number;
}

const PRIORITY_ORDER: Record<InterventionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function priorityOrder(p: InterventionPriority): number {
  return PRIORITY_ORDER[p] ?? 0;
}

function makeId(key: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${key}:${today}`;
}

// ── Trigger definitions ───────────────────────────────────────────

type TriggerDef = {
  condition: (ctx: InterventionContext) => boolean;
  build: (ctx: InterventionContext) => Omit<SystemIntervention, 'id' | 'dismissed' | 'created_at'>;
};

const TRIGGERS: Record<string, TriggerDef> = {
  genetic_peak_unused: {
    condition: (ctx) =>
      ctx.geneticPhase === 'peak' &&
      ctx.questsCompletedToday === 0 &&
      ctx.currentHour >= 9 && ctx.currentHour <= 11,
    build: () => ({
      type: 'genetic_optimization',
      priority: 'high',
      title: 'Peak Window Active — Zero Output',
      message: 'Your cognitive peak (8am-12pm) is active but no quests completed. This is your highest-leverage window. Every minute wasted here costs 3x elsewhere.',
      action: { label: 'Start Quest', route: '/quests' },
    }),
  },

  streak_at_risk: {
    condition: (ctx) =>
      ctx.currentHour >= 20 &&
      ctx.questsCompletedToday === 0 &&
      ctx.streak > 0,
    build: (ctx) => ({
      type: 'risk_alert',
      priority: 'critical',
      title: `${ctx.streak}-Day Streak at Risk`,
      message: `4 hours until midnight. Zero quests completed. Complete one quest to preserve your ${ctx.streak}-day streak. Failure means reset to zero.`,
      action: { label: 'Save Streak', route: '/quests' },
    }),
  },

  caffeine_warning: {
    condition: (ctx) =>
      !!ctx.lastCaffeineTime &&
      new Date(ctx.lastCaffeineTime).getHours() >= 10 &&
      !ctx.caffeineWarningShownToday,
    build: () => ({
      type: 'risk_alert',
      priority: 'medium',
      title: 'CYP1A2 Violation Detected',
      message: 'Caffeine consumed after 10am. Slow metabolism genetics mean this will disrupt sleep architecture tonight. Expect -20% cognitive performance tomorrow.',
      action: { label: 'Acknowledge', callback: 'dismissCaffeineWarning' },
    }),
  },

  crash_window_approaching: {
    condition: (ctx) =>
      ctx.currentHour === 13 &&
      ctx.geneticPhase === 'recovery',
    build: () => ({
      type: 'genetic_optimization',
      priority: 'medium',
      title: 'Crash Window in 60 Minutes',
      message: 'COMT crash window (2-5pm) approaching. Complete high-cognition tasks now. After 2pm: admin work, exercise, or strategic recovery only.',
      action: { label: 'View Quests', route: '/quests' },
    }),
  },

  momentum_detected: {
    condition: (ctx) =>
      ctx.questsCompletedToday >= 3 &&
      ctx.lastQuestCompletedMinutesAgo < 15 &&
      ctx.geneticPhase !== 'dip',
    build: (ctx) => ({
      type: 'momentum_capture',
      priority: 'medium',
      title: 'Momentum Detected — Keep Pushing',
      message: `${ctx.questsCompletedToday} quests completed. You're in flow. One more quest locks in an exceptional day. Don't stop now.`,
      action: { label: 'Continue', route: '/quests' },
    }),
  },

  overtraining_risk: {
    condition: (ctx) =>
      ctx.fatigueAccumulation > 35 &&
      ctx.workoutScheduledToday,
    build: () => ({
      type: 'recovery_mandate',
      priority: 'high',
      title: 'System Override: Recovery Required',
      message: 'Fatigue accumulation at critical threshold. Training today will produce negative returns. Deload protocol activated. Rest or light mobility only.',
      action: { label: 'View Recovery', route: '/training' },
    }),
  },

  weekly_planning_due: {
    condition: (ctx) =>
      ctx.dayOfWeek === 3 && // Wednesday
      ctx.currentHour >= 18 &&
      !ctx.weeklyPlanCompleted,
    build: () => ({
      type: 'accountability_check',
      priority: 'medium',
      title: 'Sprint Days Approaching — No Plan',
      message: 'Thursday begins your peak output window (Thu-Sat). No weekly plan set. Plan now or waste your highest-leverage days.',
      action: { label: 'Plan Sprint', callback: 'openWeeklyPlanning' },
    }),
  },

  shadow_army_stagnant: {
    condition: (ctx) =>
      ctx.daysSinceLastShadowActivation > 7,
    build: () => ({
      type: 'pattern_insight',
      priority: 'low',
      title: 'Shadow Army Dormant',
      message: 'No shadow activations in 7 days. Compounding assets only compound when used. Activate a shadow to extract value.',
      action: { label: 'View Shadows', route: '/' },
    }),
  },

  exceptional_day: {
    condition: (ctx) =>
      ctx.questsCompletedToday >= 5 &&
      ctx.xpEarnedToday > ctx.averageDailyXP * 1.5 &&
      ctx.currentHour >= 20,
    build: (ctx) => ({
      type: 'celebration',
      priority: 'low',
      title: 'Exceptional Output Logged',
      message: `${ctx.questsCompletedToday} quests. ${ctx.xpEarnedToday} XP. Top 10% day. The gap between you and your goal just got smaller. Rest. Recover. Repeat tomorrow.`,
    }),
  },
};

// ── Engine ─────────────────────────────────────────────────────────

export function checkAllTriggers(ctx: InterventionContext): SystemIntervention[] {
  const now = new Date().toISOString();
  const results: SystemIntervention[] = [];

  for (const [key, trigger] of Object.entries(TRIGGERS)) {
    try {
      if (trigger.condition(ctx)) {
        const built = trigger.build(ctx);
        results.push({
          ...built,
          id: makeId(key),
          dismissed: false,
          created_at: now,
        });
      }
    } catch {
      // Skip broken triggers silently
    }
  }

  return results;
}

export function sortByPriority(interventions: SystemIntervention[]): SystemIntervention[] {
  return [...interventions].sort((a, b) => priorityOrder(b.priority) - priorityOrder(a.priority));
}
