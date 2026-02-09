import { GeneticState, COMTPhase, ACTN3Status } from '@/utils/geneticEngine';
import { getDayProfile, DayProfile } from '@/utils/weeklyRhythm';

// ── Types ────────────────────────────────────────────────────────────

export type TrainingUrgency = 'high' | 'medium' | 'low' | 'none';

export interface TrainingRecommendation {
  shouldTrainNow: boolean;
  urgency: TrainingUrgency;
  reason: string;        // WHY line shown on Training page
  nudgeMessage: string;  // Contextual nudge shown on Quests page
  nudgeType: 'comt-dip' | 'morning-activation' | 'post-sprint-recovery' | 'general' | 'none';
  estimatedDuration: string; // e.g. "15-20 min"
  postWorkoutBuff: PostWorkoutBuff | null;
}

export interface PostWorkoutBuff {
  name: string;
  effect: string;
  icon: string;
  type: 'second-wind' | 'actn3-primed' | 'recovery-boost';
}

// ── Core Logic ───────────────────────────────────────────────────────

export function getTrainingRecommendation(
  geneticState: GeneticState,
  sprintsToday: number,
  workoutCompleted: boolean,
  now: Date = new Date(),
): TrainingRecommendation {
  const hour = now.getHours();
  const dayProfile = getDayProfile(now);

  // Already trained today — no recommendation
  if (workoutCompleted) {
    return {
      shouldTrainNow: false,
      urgency: 'none',
      reason: getCompletedReason(geneticState, dayProfile),
      nudgeMessage: '',
      nudgeType: 'none',
      estimatedDuration: '',
      postWorkoutBuff: null,
    };
  }

  // 1. COMT DIP DETECTED (2-5 PM) — highest priority training trigger
  if (geneticState.comtPhase === 'dip' && hour >= 14 && hour < 17) {
    return {
      shouldTrainNow: true,
      urgency: 'high',
      reason: 'Training today: COMT reset. Short, explosive session to clear afternoon dopamine dip.',
      nudgeMessage: 'Dopamine dip detected. Exercise is your fastest reset. Train now?',
      nudgeType: 'comt-dip',
      estimatedDuration: '20-30 min',
      postWorkoutBuff: {
        name: 'Second Wind',
        effect: '+15% XP for next 2 hours',
        icon: '🧊',
        type: 'second-wind',
      },
    };
  }

  // 2. MORNING PRE-SPRINT on sprint days (Fri-Sat)
  if (dayProfile.dayType === 'sprint' && hour >= 5 && hour < 10 && sprintsToday === 0) {
    return {
      shouldTrainNow: true,
      urgency: 'high',
      reason: 'Training today: ACTN3 activation. Prime your sprinter genetics before the first sprint.',
      nudgeMessage: 'Morning activation: A short training session will prime your Sprinter gene for peak performance.',
      nudgeType: 'morning-activation',
      estimatedDuration: '15-20 min',
      postWorkoutBuff: {
        name: 'ACTN3 Primed',
        effect: 'First sprint bonus: +25% XP',
        icon: '💥',
        type: 'actn3-primed',
      },
    };
  }

  // 3. POST-SPRINT RECOVERY after 3+ sprints
  if (sprintsToday >= 3) {
    return {
      shouldTrainNow: true,
      urgency: 'medium',
      reason: 'Training today: Sprint recovery. Light movement to accelerate cognitive reset.',
      nudgeMessage: 'Sprint recovery: Light movement will accelerate cognitive reset. 10-minute stretch recommended.',
      nudgeType: 'post-sprint-recovery',
      estimatedDuration: '10-15 min',
      postWorkoutBuff: {
        name: 'Recovery Boost',
        effect: 'Faster cognitive reset between sprints',
        icon: '🌿',
        type: 'recovery-boost',
      },
    };
  }

  // 4. Day-type based general recommendations
  return getDayTypeRecommendation(dayProfile, geneticState, hour);
}

// ── Day-Type Recommendations ─────────────────────────────────────────

function getDayTypeRecommendation(
  day: DayProfile,
  geneticState: GeneticState,
  hour: number,
): TrainingRecommendation {
  const base: TrainingRecommendation = {
    shouldTrainNow: false,
    urgency: 'low',
    reason: '',
    nudgeMessage: '',
    nudgeType: 'general',
    estimatedDuration: '',
    postWorkoutBuff: null,
  };

  switch (day.dayType) {
    case 'work':
      // Wednesday (depleted) — optional light only
      if (day.energyProfile === 'depleted') {
        return {
          ...base,
          reason: 'Training is optional today. If energy permits, a 10-minute walk will aid tomorrow\'s transition.',
          estimatedDuration: '10 min',
          urgency: 'low',
        };
      }
      // Other work days — short sessions for energy management
      if (hour < 5 || hour >= 16) {
        return {
          ...base,
          shouldTrainNow: hour >= 16 && hour < 19,
          reason: 'Training today: Energy management. Short session to maintain without draining.',
          nudgeMessage: hour >= 16 ? 'Post-shift training window open. Short session recommended.' : '',
          estimatedDuration: '15-20 min',
          urgency: 'medium',
        };
      }
      return {
        ...base,
        reason: 'Training today: Energy management. Short session to maintain without draining.',
        estimatedDuration: '15-20 min',
      };

    case 'transition':
      return {
        ...base,
        shouldTrainNow: hour >= 7 && hour < 10,
        reason: 'Training today: Transition activation. Full session to build momentum for the sprint days ahead.',
        nudgeMessage: hour >= 7 && hour < 10 ? 'Transition day — a training session now will prime you for the sprint.' : '',
        estimatedDuration: '30-45 min',
        urgency: 'medium',
        postWorkoutBuff: {
          name: 'ACTN3 Primed',
          effect: 'First sprint bonus: +25% XP',
          icon: '💥',
          type: 'actn3-primed',
        },
      };

    case 'sprint':
      return {
        ...base,
        shouldTrainNow: hour >= 6 && hour < 9,
        reason: 'Training today: ACTN3 activation. Prime your sprinter genetics before the first sprint.',
        nudgeMessage: hour >= 6 && hour < 9 ? 'Sprint day — morning training will maximize your output.' : '',
        estimatedDuration: '30-45 min',
        urgency: 'high',
        postWorkoutBuff: {
          name: 'ACTN3 Primed',
          effect: 'First sprint bonus: +25% XP',
          icon: '💥',
          type: 'actn3-primed',
        },
      };
  }

  return base;
}

// ── Recovery Mode Override ───────────────────────────────────────────

function getCompletedReason(geneticState: GeneticState, day: DayProfile): string {
  if (geneticState.comtPhase === 'recovery') {
    return 'Training complete. Recovery movement logged. Warrior gene resetting.';
  }
  if (day.dayType === 'sprint') {
    return 'Training complete. ACTN3 primed for sprint performance.';
  }
  return 'Training complete. Energy management protocol fulfilled.';
}

// ── Buff Key for localStorage ────────────────────────────────────────

const TRAINING_BUFF_KEY = 'systemTrainingBuff';

export interface ActiveTrainingBuff {
  buff: PostWorkoutBuff;
  activatedAt: string; // ISO string
  expiresAt: string;   // ISO string
}

export function activateTrainingBuff(buff: PostWorkoutBuff): void {
  const now = new Date();
  const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  const active: ActiveTrainingBuff = {
    buff,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  localStorage.setItem(TRAINING_BUFF_KEY, JSON.stringify(active));
  window.dispatchEvent(new Event('geneticHudUpdate'));
}

export function getActiveTrainingBuff(): ActiveTrainingBuff | null {
  try {
    const stored = localStorage.getItem(TRAINING_BUFF_KEY);
    if (!stored) return null;
    const active: ActiveTrainingBuff = JSON.parse(stored);
    if (new Date(active.expiresAt) <= new Date()) {
      localStorage.removeItem(TRAINING_BUFF_KEY);
      return null;
    }
    return active;
  } catch {
    return null;
  }
}

export function clearExpiredTrainingBuff(): void {
  getActiveTrainingBuff(); // side effect: clears if expired
}
