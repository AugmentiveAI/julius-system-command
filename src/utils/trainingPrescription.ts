import { GeneticState, COMTPhase } from '@/utils/geneticEngine';
import { PlayerStateCheck } from '@/types/playerState';
import { IntensityLevel, WorkoutType, WEEKLY_SCHEDULE } from '@/types/training';
import { getWorkoutReadiness, getWorkoutRecoveryReport, RecoveryStatus } from '@/utils/muscleRecovery';
import { getDayProfile } from '@/utils/weeklyRhythm';

// ── Types ────────────────────────────────────────────────────────────

export interface TrainingPrescription {
  prescribedIntensity: IntensityLevel;
  reason: string;                       // Why this intensity
  readinessScore: number;               // 0-100
  signals: PrescriptionSignal[];        // Each factor's contribution
  overrideWarning: string | null;       // If muscles are sore, warn
  xpMultiplier: number;                 // Heavy=1.2, Moderate=1.0, Light=0.8
}

export interface PrescriptionSignal {
  source: string;   // e.g. "State Check", "COMT Phase", "Recovery"
  value: string;    // e.g. "Energy: 4/5", "Peak", "Chest: 85% recovered"
  impact: 'boost' | 'neutral' | 'reduce';
}

// ── Intensity Scaling ────────────────────────────────────────────────

const INTENSITY_SETS_MODIFIER: Record<IntensityLevel, { setsMultiplier: number; repsShift: string }> = {
  heavy: { setsMultiplier: 1.0, repsShift: '-2 reps, +load' },
  moderate: { setsMultiplier: 0.85, repsShift: 'standard' },
  light: { setsMultiplier: 0.65, repsShift: '+3 reps, -load' },
};

export function getIntensityModifier(intensity: IntensityLevel) {
  return INTENSITY_SETS_MODIFIER[intensity];
}

// ── Core Prescription Engine ─────────────────────────────────────────

export function prescribeTraining(
  workoutType: WorkoutType,
  geneticState: GeneticState,
  latestState: PlayerStateCheck | null,
  now: Date = new Date(),
): TrainingPrescription {
  const signals: PrescriptionSignal[] = [];
  let score = 70; // baseline

  // 1. Muscle recovery
  const readiness = getWorkoutReadiness(workoutType, now);
  const recoveryReports = getWorkoutRecoveryReport(workoutType, now);
  const soreGroups = recoveryReports.filter(r => r.status === 'sore');

  signals.push({
    source: 'Muscle Recovery',
    value: `${readiness}% recovered`,
    impact: readiness >= 80 ? 'boost' : readiness >= 50 ? 'neutral' : 'reduce',
  });
  score += (readiness - 70) * 0.3;

  // 2. State Check (if available)
  if (latestState) {
    const stateAge = (now.getTime() - new Date(latestState.timestamp).getTime()) / (1000 * 60 * 60);
    if (stateAge < 12) { // Only use recent scans
      const energyImpact = latestState.energy >= 4 ? 'boost' : latestState.energy <= 2 ? 'reduce' : 'neutral';
      signals.push({
        source: 'Energy Level',
        value: `${latestState.energy}/5`,
        impact: energyImpact,
      });
      score += (latestState.energy - 3) * 8;

      const stressImpact = latestState.stress <= 2 ? 'boost' : latestState.stress >= 4 ? 'reduce' : 'neutral';
      signals.push({
        source: 'Stress Level',
        value: `${latestState.stress}/5`,
        impact: stressImpact,
      });
      score -= (latestState.stress - 3) * 6;

      signals.push({
        source: 'System Mode',
        value: latestState.systemRecommendation.toUpperCase(),
        impact: latestState.systemRecommendation === 'push' ? 'boost' : latestState.systemRecommendation === 'recover' ? 'reduce' : 'neutral',
      });
      if (latestState.systemRecommendation === 'push') score += 10;
      if (latestState.systemRecommendation === 'recover') score -= 15;
    }
  }

  // 3. Genetic state
  const comtImpact = geneticState.comtPhase === 'peak' ? 'boost' : geneticState.comtPhase === 'dip' ? 'reduce' : 'neutral';
  signals.push({
    source: 'COMT Phase',
    value: geneticState.comtPhase.charAt(0).toUpperCase() + geneticState.comtPhase.slice(1),
    impact: comtImpact,
  });
  if (geneticState.comtPhase === 'peak') score += 12;
  if (geneticState.comtPhase === 'dip') score -= 10;
  if (geneticState.comtPhase === 'recovery') score -= 5;

  const actnImpact = geneticState.actn3Status === 'fresh' ? 'boost' : geneticState.actn3Status === 'depleted' ? 'reduce' : 'neutral';
  signals.push({
    source: 'ACTN3 Status',
    value: geneticState.actn3Status.charAt(0).toUpperCase() + geneticState.actn3Status.slice(1),
    impact: actnImpact,
  });
  if (geneticState.actn3Status === 'depleted') score -= 15;

  // 4. Day profile
  const dayProfile = getDayProfile(now);
  if (dayProfile.dayType === 'sprint') score += 5;
  if (dayProfile.energyProfile === 'depleted') score -= 10;

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine intensity
  let prescribedIntensity: IntensityLevel;
  if (score >= 75) prescribedIntensity = 'heavy';
  else if (score >= 45) prescribedIntensity = 'moderate';
  else prescribedIntensity = 'light';

  // Override: if any target muscles are sore, cap at moderate
  if (soreGroups.length > 0 && prescribedIntensity === 'heavy') {
    prescribedIntensity = 'moderate';
  }

  // Build reason string
  const reason = buildPrescriptionReason(prescribedIntensity, signals, soreGroups);

  // Override warning
  const overrideWarning = soreGroups.length > 0
    ? `${soreGroups.map(g => g.muscleGroup).join(', ')} still recovering — intensity capped at moderate.`
    : null;

  // XP multiplier
  const xpMultiplier = prescribedIntensity === 'heavy' ? 1.2 : prescribedIntensity === 'moderate' ? 1.0 : 0.8;

  return {
    prescribedIntensity,
    reason,
    readinessScore: score,
    signals,
    overrideWarning,
    xpMultiplier,
  };
}

// ── Reason Builder ───────────────────────────────────────────────────

function buildPrescriptionReason(
  intensity: IntensityLevel,
  signals: PrescriptionSignal[],
  soreGroups: { muscleGroup: string; status: RecoveryStatus }[],
): string {
  const boosts = signals.filter(s => s.impact === 'boost');
  const reductions = signals.filter(s => s.impact === 'reduce');

  if (intensity === 'heavy') {
    const drivers = boosts.map(s => s.source).slice(0, 2).join(' + ');
    return `System prescribes HEAVY. ${drivers || 'All signals green'}. Attack with full intensity.`;
  }

  if (intensity === 'light') {
    const reasons = reductions.map(s => `${s.source}: ${s.value}`).slice(0, 2).join(', ');
    return `System prescribes LIGHT. ${reasons || 'Multiple recovery signals'}. Focus on form and controlled movement.`;
  }

  // Moderate
  if (soreGroups.length > 0) {
    return `System prescribes MODERATE. ${soreGroups[0].muscleGroup} still recovering. Controlled volume, no ego lifts.`;
  }
  return 'System prescribes MODERATE. Balanced signals. Solid session, maintain progressive overload.';
}

// ── Exercise Scaling ─────────────────────────────────────────────────

export interface ScaledExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  originalSets: number;
  originalReps: string;
  scaled: boolean;
}

/** Scale exercises based on prescribed intensity */
export function scaleExercises(
  exercises: { id: string; name: string; sets: number; reps: string }[],
  intensity: IntensityLevel,
): ScaledExercise[] {
  const mod = INTENSITY_SETS_MODIFIER[intensity];

  return exercises.map(ex => {
    const scaledSets = Math.max(1, Math.round(ex.sets * mod.setsMultiplier));
    const scaledReps = scaleReps(ex.reps, intensity);

    return {
      id: ex.id,
      name: ex.name,
      sets: scaledSets,
      reps: scaledReps,
      originalSets: ex.sets,
      originalReps: ex.reps,
      scaled: scaledSets !== ex.sets || scaledReps !== ex.reps,
    };
  });
}

function scaleReps(reps: string, intensity: IntensityLevel): string {
  // Don't scale time-based reps (e.g. "45 min", "10 min")
  if (reps.includes('min')) return reps;

  // Parse range like "8-10" or single like "8"
  const match = reps.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!match) return reps;

  const low = parseInt(match[1]);
  const high = match[2] ? parseInt(match[2]) : low;
  const suffix = reps.replace(/\d+(?:\s*-\s*\d+)?/, '').trim(); // e.g. " each"

  switch (intensity) {
    case 'heavy':
      // Fewer reps, implies heavier load
      return `${Math.max(1, low - 2)}-${Math.max(2, high - 2)}${suffix ? ' ' + suffix : ''}`;
    case 'light':
      // More reps, lighter load
      return `${low + 3}-${high + 3}${suffix ? ' ' + suffix : ''}`;
    default:
      return reps;
  }
}
