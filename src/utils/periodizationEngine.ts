/**
 * Periodization Engine
 * Manages mesocycles, deload logic, and progressive overload recommendations.
 * Isolated from existing training systems — integrates via data, not mutation.
 */

// ── Types ────────────────────────────────────────────────────────────

export type MesocyclePhase = 'accumulation' | 'intensification' | 'deload';

export interface MesocycleState {
  currentWeek: number;        // 1-4
  phase: MesocyclePhase;
  volumeMultiplier: number;   // 1.0 normal, 0.5 deload
  intensityTarget: number;    // RPE target for the week
  startDate: string;          // ISO string
  totalWeeks: number;
}

export interface WeeklyPrescription {
  volumeMultiplier: number;
  intensityTarget: number;
  phase: MesocyclePhase;
  weekLabel: string;          // e.g. "Week 2 of 4 — Intensification"
  isDeload: boolean;
}

export interface ProgressiveOverloadSuggestion {
  exerciseName: string;
  suggestedWeight: number;
  suggestedReps: number;
  suggestedSets: number;
  rationale: string;
  isNewPR: boolean;
  plateau: boolean;
}

interface ExerciseHistory {
  weight: number;
  reps: number;
  sets: number;
  rpe: number;
  date: string;
}

// ── Constants ────────────────────────────────────────────────────────

const MESOCYCLE_KEY = 'the-system-mesocycle';
const FATIGUE_DELOAD_THRESHOLD = 35;
const HIGH_RPE_CONSECUTIVE_THRESHOLD = 2;

const WEEK_CONFIG: Record<number, { volumeMult: number; rpeTarget: number; phase: MesocyclePhase }> = {
  1: { volumeMult: 1.0, rpeTarget: 7, phase: 'accumulation' },
  2: { volumeMult: 1.1, rpeTarget: 7.5, phase: 'accumulation' },
  3: { volumeMult: 1.15, rpeTarget: 8, phase: 'intensification' },
  4: { volumeMult: 0.55, rpeTarget: 5.5, phase: 'deload' },
};

// ── Mesocycle State Management ───────────────────────────────────────

export function getMesocycleState(): MesocycleState {
  try {
    const stored = localStorage.getItem(MESOCYCLE_KEY);
    if (stored) {
      const state: MesocycleState = JSON.parse(stored);
      // Auto-advance if start date is old enough
      const weeksSinceStart = Math.floor(
        (Date.now() - new Date(state.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const effectiveWeek = Math.min((weeksSinceStart % state.totalWeeks) + 1, state.totalWeeks);

      if (effectiveWeek !== state.currentWeek) {
        const config = WEEK_CONFIG[effectiveWeek] ?? WEEK_CONFIG[1];
        const updated: MesocycleState = {
          ...state,
          currentWeek: effectiveWeek,
          phase: config.phase,
          volumeMultiplier: config.volumeMult,
          intensityTarget: config.rpeTarget,
        };
        saveMesocycleState(updated);
        return updated;
      }
      return state;
    }
  } catch { /* ignore */ }

  // Initialize new mesocycle
  const initial: MesocycleState = {
    currentWeek: 1,
    phase: 'accumulation',
    volumeMultiplier: 1.0,
    intensityTarget: 7,
    startDate: new Date().toISOString(),
    totalWeeks: 4,
  };
  saveMesocycleState(initial);
  return initial;
}

function saveMesocycleState(state: MesocycleState) {
  try {
    localStorage.setItem(MESOCYCLE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function resetMesocycle(): MesocycleState {
  const fresh: MesocycleState = {
    currentWeek: 1,
    phase: 'accumulation',
    volumeMultiplier: 1.0,
    intensityTarget: 7,
    startDate: new Date().toISOString(),
    totalWeeks: 4,
  };
  saveMesocycleState(fresh);
  return fresh;
}

// ── Deload Detection ─────────────────────────────────────────────────

export interface DeloadDecision {
  shouldDeload: boolean;
  reason: string;
  trigger: 'scheduled' | 'fatigue' | 'high-rpe' | 'low-readiness' | 'genetic-crash' | 'none';
}

export function evaluateDeload(
  mesocycle: MesocycleState,
  fatigueAccumulation: number,
  recentRPEs: number[],
  recentReadiness: number[],
  geneticPhase: string | null,
): DeloadDecision {
  // 1. Scheduled deload week
  if (mesocycle.phase === 'deload') {
    return {
      shouldDeload: true,
      reason: `Scheduled deload — Week ${mesocycle.currentWeek} of ${mesocycle.totalWeeks}. Volume reduced ${Math.round((1 - mesocycle.volumeMultiplier) * 100)}%.`,
      trigger: 'scheduled',
    };
  }

  // 2. Fatigue accumulation threshold
  if (fatigueAccumulation > FATIGUE_DELOAD_THRESHOLD) {
    return {
      shouldDeload: true,
      reason: `Fatigue accumulation: ${fatigueAccumulation}/40. System override: deload activated.`,
      trigger: 'fatigue',
    };
  }

  // 3. Consecutive high RPE
  const lastN = recentRPEs.slice(-HIGH_RPE_CONSECUTIVE_THRESHOLD);
  if (lastN.length >= HIGH_RPE_CONSECUTIVE_THRESHOLD && lastN.every(rpe => rpe >= 9)) {
    return {
      shouldDeload: true,
      reason: `${HIGH_RPE_CONSECUTIVE_THRESHOLD}+ consecutive sessions at RPE 9+. CNS fatigue likely. Deload recommended.`,
      trigger: 'high-rpe',
    };
  }

  // 4. Low readiness
  const lastReadiness = recentReadiness.slice(-2);
  if (lastReadiness.length >= 2 && lastReadiness.every(r => r < 4)) {
    return {
      shouldDeload: true,
      reason: 'Readiness below 4 for 2+ consecutive sessions. Recovery deficit detected.',
      trigger: 'low-readiness',
    };
  }

  // 5. Genetic crash phase + low readiness
  if (geneticPhase === 'warrior_crash' && recentReadiness.length > 0 && recentReadiness[recentReadiness.length - 1] < 5) {
    return {
      shouldDeload: true,
      reason: 'Genetic crash window + low readiness. Volume auto-reduced for recovery.',
      trigger: 'genetic-crash',
    };
  }

  return { shouldDeload: false, reason: '', trigger: 'none' };
}

// ── Weekly Prescription ──────────────────────────────────────────────

export function getWeeklyPrescription(mesocycle: MesocycleState): WeeklyPrescription {
  const config = WEEK_CONFIG[mesocycle.currentWeek] ?? WEEK_CONFIG[1];
  return {
    volumeMultiplier: config.volumeMult,
    intensityTarget: config.rpeTarget,
    phase: config.phase,
    weekLabel: `Week ${mesocycle.currentWeek} of ${mesocycle.totalWeeks} — ${capitalize(config.phase)}`,
    isDeload: config.phase === 'deload',
  };
}

// ── Progressive Overload Calculator ──────────────────────────────────

export function calculateProgressiveOverload(
  exerciseName: string,
  history: ExerciseHistory[],
  isUpperBody: boolean,
): ProgressiveOverloadSuggestion {
  if (history.length === 0) {
    return {
      exerciseName,
      suggestedWeight: 0,
      suggestedReps: 0,
      suggestedSets: 0,
      rationale: 'First session. Establish baseline — pick a moderate weight you can control for all reps.',
      isNewPR: false,
      plateau: false,
    };
  }

  const latest = history[history.length - 1];
  const increment = isUpperBody ? 5 : 10; // lbs

  // Check plateau: no weight increase in last 3+ sessions
  const plateau = history.length >= 3 && history.slice(-3).every(h => h.weight === latest.weight);

  // If last session completed at target RPE (≤ 8), progress
  if (latest.rpe <= 8) {
    return {
      exerciseName,
      suggestedWeight: latest.weight + increment,
      suggestedReps: latest.reps,
      suggestedSets: latest.sets,
      rationale: `+${increment} lbs from last session. All reps completed at RPE ${latest.rpe}.`,
      isNewPR: true,
      plateau: false,
    };
  }

  // If RPE was high (9+), hold weight and try more reps
  if (latest.rpe >= 9) {
    return {
      exerciseName,
      suggestedWeight: latest.weight,
      suggestedReps: latest.reps,
      suggestedSets: latest.sets,
      rationale: `Match last session. RPE was ${latest.rpe} — consolidate before progressing.`,
      isNewPR: false,
      plateau,
    };
  }

  // Default: hold
  return {
    exerciseName,
    suggestedWeight: latest.weight,
    suggestedReps: latest.reps,
    suggestedSets: latest.sets,
    rationale: 'Hold current load. Build consistency.',
    isNewPR: false,
    plateau,
  };
}

// ── Plateau Detection ────────────────────────────────────────────────

export function detectPlateau(history: ExerciseHistory[]): boolean {
  if (history.length < 3) return false;
  const last3 = history.slice(-3);
  const firstWeight = last3[0].weight;
  return last3.every(h => h.weight === firstWeight);
}

// ── Genetic Calibration ──────────────────────────────────────────────

export interface CalibratedPrescription extends WeeklyPrescription {
  geneticAlert: string | null;
  xpBonus: number; // multiplier, default 1.0
}

export function calibrateToGeneticState(
  prescription: WeeklyPrescription,
  geneticPhase: string | null,
  sprintCount: number,
): CalibratedPrescription {
  if (geneticPhase === 'warrior_crash') {
    return {
      ...prescription,
      volumeMultiplier: prescription.volumeMultiplier * 0.7,
      intensityTarget: Math.min(prescription.intensityTarget, 7),
      geneticAlert: 'Training in crash window. Volume auto-reduced 30%.',
      xpBonus: 1.0,
    };
  }

  if (sprintCount >= 4) {
    return {
      ...prescription,
      volumeMultiplier: prescription.volumeMultiplier * 0.8,
      geneticAlert: '4+ sprints today. CNS fatigue likely. Intensity capped.',
      xpBonus: 1.0,
    };
  }

  if (geneticPhase === 'warrior_peak') {
    return {
      ...prescription,
      geneticAlert: 'Peak genetic window. Max output potential.',
      xpBonus: 1.25,
    };
  }

  return {
    ...prescription,
    geneticAlert: null,
    xpBonus: 1.0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
