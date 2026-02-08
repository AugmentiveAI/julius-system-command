import { QuestDifficulty } from '@/types/questDifficulty';

// ── Types ────────────────────────────────────────────────────────────

export type COMTPhase = 'peak' | 'stable' | 'dip' | 'recovery';
export type ACTN3Status = 'fresh' | 'active' | 'fatigued' | 'depleted';

export interface GeneticBuff {
  name: string;
  effect: string;
  icon: string;
}

export interface GeneticDebuff {
  name: string;
  effect: string;
  icon: string;
  mitigation: string;
}

export interface GeneticState {
  comtPhase: COMTPhase;
  actn3Status: ACTN3Status;
  activeBuffs: GeneticBuff[];
  activeDebuffs: GeneticDebuff[];
  systemAdvice: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function hoursSince(from: Date | null, now: Date): number | null {
  if (!from) return null;
  return (now.getTime() - new Date(from).getTime()) / (1000 * 60 * 60);
}

// ── COMT Phase ───────────────────────────────────────────────────────

function determineCOMTPhase(
  hour: number,
  stressLevel: number,
  lastColdExposure: Date | null,
  lastMagnesium: Date | null,
  now: Date,
): COMTPhase {
  // Stress override: any time stress = 5 → dip
  if (stressLevel >= 5) return 'dip';

  // Check recovery triggers
  const coldHoursAgo = hoursSince(lastColdExposure, now);
  const magHoursAgo = hoursSince(lastMagnesium, now);

  const coldRecoveryActive = coldHoursAgo !== null && coldHoursAgo < 2;
  const magRecoveryActive = magHoursAgo !== null && magHoursAgo < 3;

  // Evening is always recovery
  if (hour >= 18) return 'recovery';

  // During dip window, cold/mag can trigger recovery
  if (hour >= 14 && hour < 17) {
    if (coldRecoveryActive || magRecoveryActive) return 'recovery';
    return 'dip';
  }

  // Peak window
  if (hour >= 8 && hour < 12 && stressLevel < 4) return 'peak';

  // Stable windows
  if ((hour >= 6 && hour < 8) || (hour >= 12 && hour < 14)) return 'stable';

  // Early morning / late afternoon default
  if (hour >= 17 && hour < 18) return 'stable';
  if (hour < 6) return 'recovery';

  return 'stable';
}

// ── ACTN3 Status ─────────────────────────────────────────────────────

function determineACTN3Status(sprintsToday: number): ACTN3Status {
  if (sprintsToday <= 1) return 'fresh';
  if (sprintsToday <= 3) return 'active';
  if (sprintsToday === 4) return 'fatigued';
  return 'depleted';
}

// ── Main Function ────────────────────────────────────────────────────

export function getGeneticState(
  currentTime: Date,
  lastColdExposure: Date | null,
  lastMagnesium: Date | null,
  sprintsCompletedToday: number,
  currentStressLevel: 1 | 2 | 3 | 4 | 5,
): GeneticState {
  const hour = currentTime.getHours();
  const comtPhase = determineCOMTPhase(hour, currentStressLevel, lastColdExposure, lastMagnesium, currentTime);
  const actn3Status = determineACTN3Status(sprintsCompletedToday);

  const activeBuffs: GeneticBuff[] = [];
  const activeDebuffs: GeneticDebuff[] = [];
  const adviceParts: string[] = [];

  // ── COMT buffs/debuffs ──

  switch (comtPhase) {
    case 'peak':
      activeBuffs.push(
        { name: 'Warrior Focus', effect: '+20% XP on all quests', icon: '⚔️' },
        { name: 'Dopamine Surge', effect: 'S-rank quests unlocked', icon: '🔥' },
      );
      adviceParts.push('COMT peak window active. This is your time. Attack the hardest quest NOW.');
      break;

    case 'stable':
      activeBuffs.push(
        { name: 'Steady State', effect: 'Normal operations', icon: '⚡' },
      );
      adviceParts.push('Transitional window. Good for A/B-rank quests.');
      break;

    case 'dip': {
      const mitigations: string[] = [];
      const coldHrs = hoursSince(lastColdExposure, currentTime);
      const magHrs = hoursSince(lastMagnesium, currentTime);

      if (coldHrs === null || coldHrs >= 2) mitigations.push('cold exposure');
      if (magHrs === null || magHrs >= 3) mitigations.push('magnesium');

      const mitigationStr = mitigations.length > 0
        ? `${mitigations.join(' or ')} can activate recovery buff`
        : 'All mitigations deployed. Wait for natural recovery.';

      activeDebuffs.push(
        { name: 'Dopamine Dip', effect: '-20% XP on S-rank quests', icon: '📉', mitigation: mitigationStr },
        { name: 'Warrior Fatigue', effect: 'Difficulty reduced one tier', icon: '😮‍💨', mitigation: mitigationStr },
      );
      adviceParts.push('Dip detected. The System has reduced expectations. Focus on B/C-rank tasks.');
      break;
    }

    case 'recovery': {
      const coldHrsRecovery = hoursSince(lastColdExposure, currentTime);
      // Second Wind: cold exposure done during/after dip window
      if (coldHrsRecovery !== null && coldHrsRecovery < 2 && hour >= 14) {
        activeBuffs.push(
          { name: 'Second Wind', effect: '+15% XP for 2 hours post-cold', icon: '🧊' },
        );
      }
      activeBuffs.push(
        { name: 'Recovery Mode', effect: 'Warrior gene resetting', icon: '🌙' },
      );
      adviceParts.push('Recovery protocols engaged. Warrior gene resetting for tomorrow.');
      break;
    }
  }

  // ── ACTN3 buffs/debuffs ──

  switch (actn3Status) {
    case 'fresh':
      activeBuffs.push(
        { name: 'Explosive Potential', effect: 'First sprint: +25% XP', icon: '💥' },
      );
      adviceParts.push('Sprinter gene fully loaded. Make this first sprint count.');
      break;

    case 'active': {
      const remaining = 4 - sprintsCompletedToday;
      adviceParts.push(`Sprints tracking well. ${remaining} sprint${remaining !== 1 ? 's' : ''} remaining before fatigue.`);
      break;
    }

    case 'fatigued':
      activeDebuffs.push(
        { name: 'Diminishing Returns', effect: '-15% XP on sprint quests', icon: '⚠️', mitigation: 'Take a 15-minute break before next sprint.' },
      );
      adviceParts.push('Sprint limit approaching. Mandatory rest recommended before next sprint.');
      break;

    case 'depleted':
      activeDebuffs.push(
        { name: 'Sprint Burnout', effect: '-30% XP, difficulty forcibly reduced', icon: '🛑', mitigation: 'Switch to recovery quests. S-rank locked until rest or next day.' },
      );
      adviceParts.push('The System will not allow further damage. Switch to recovery quests.');
      break;
  }

  return {
    comtPhase,
    actn3Status,
    activeBuffs,
    activeDebuffs,
    systemAdvice: adviceParts.join(' '),
  };
}

// ── XP Multiplier ────────────────────────────────────────────────────

export function getGeneticXPMultiplier(state: GeneticState, questDifficulty: QuestDifficulty, isSprint: boolean): number {
  let multiplier = 1;

  // COMT modifiers
  switch (state.comtPhase) {
    case 'peak':
      multiplier *= 1.2;
      break;
    case 'dip':
      if (questDifficulty === 'S') multiplier *= 0.8;
      break;
    case 'recovery':
      // Second Wind buff
      if (state.activeBuffs.some(b => b.name === 'Second Wind')) {
        multiplier *= 1.15;
      }
      break;
  }

  // ACTN3 modifiers
  if (isSprint) {
    switch (state.actn3Status) {
      case 'fresh':
        multiplier *= 1.25;
        break;
      case 'fatigued':
        multiplier *= 0.85;
        break;
      case 'depleted':
        multiplier *= 0.7;
        break;
    }
  }

  return Math.round(multiplier * 100) / 100;
}

// ── Quest Filter ─────────────────────────────────────────────────────

export function getGeneticQuestFilter(state: GeneticState): {
  allowedDifficulties: QuestDifficulty[];
  lockedReason: string | null;
} {
  const all: QuestDifficulty[] = ['S', 'A', 'B', 'C', 'D'];

  // ACTN3 depleted: lock S-rank
  if (state.actn3Status === 'depleted') {
    return {
      allowedDifficulties: ['A', 'B', 'C', 'D'],
      lockedReason: 'Sprint Burnout active. S-rank quests locked until rest or next day.',
    };
  }

  // COMT dip: lock S-rank unless recovery buffs active
  if (state.comtPhase === 'dip') {
    return {
      allowedDifficulties: ['A', 'B', 'C', 'D'],
      lockedReason: 'Dopamine dip window. S-rank quests locked. Use cold exposure or magnesium to unlock.',
    };
  }

  // COMT recovery without second wind: lock S-rank
  if (state.comtPhase === 'recovery' && !state.activeBuffs.some(b => b.name === 'Second Wind')) {
    return {
      allowedDifficulties: ['A', 'B', 'C', 'D'],
      lockedReason: 'Recovery mode active. S-rank quests locked until next peak window.',
    };
  }

  return { allowedDifficulties: all, lockedReason: null };
}
