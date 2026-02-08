import { generateVariableReward, VariableReward } from '@/utils/persuasionEngine';
import { ResistanceAnalysis } from '@/utils/resistanceTracker';

// ── Types ────────────────────────────────────────────────────────────

export type ShadowQuestType =
  | 'shadow_sprint'
  | 'the_gauntlet'
  | 'phantom_outreach'
  | 'mirror_quest'
  | 'stealth_recovery'
  | 'time_warp'
  | 'monarchs_challenge';

export interface ShadowQuest {
  id: string;
  type: ShadowQuestType;
  title: string;
  description: string;
  condition: string;
  rewardXP: number;
  rewardMessage: string;
  expiresAt: string; // ISO timestamp
  activatedAt: string; // ISO timestamp
  completed: boolean;
  expired: boolean;
  variableReward: VariableReward;
  extraReward?: string; // badge or title
  mirrorQuestId?: string; // for mirror_quest type
}

export interface ShadowQuestState {
  today: string; // YYYY-MM-DD
  quest: ShadowQuest | null;
  triggered: boolean; // has the notification been shown
  completionsToday: number; // tracks quest completions to trigger at 2nd
  stats: ShadowQuestStats;
}

export interface ShadowQuestStats {
  totalGenerated: number;
  totalCompleted: number;
  totalExpired: number;
  completionRate: number;
  difficultyModifier: number; // 1.0 = normal, increases with high rate
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'systemShadowQuest';
const EXPIRY_HOURS = 2;

// ── Shadow Quest Templates ──────────────────────────────────────────

interface ShadowQuestTemplate {
  type: ShadowQuestType;
  title: string;
  description: string;
  condition: string;
  baseXP: number;
  rewardMessage: string;
  extraReward?: string;
  recoveryOnly?: boolean;
  excludeRecovery?: boolean;
}

const SHADOW_QUEST_TEMPLATES: ShadowQuestTemplate[] = [
  {
    type: 'shadow_sprint',
    title: 'Shadow Sprint',
    description: 'Complete any A-Rank or higher quest within 30 minutes of this notification.',
    condition: 'Complete an A+ quest within 30 minutes',
    baseXP: 0, // 3x on the completed quest instead
    rewardMessage: 'Sprint complete. 3x XP applied to the target quest. Speed is power.',
    excludeRecovery: true,
  },
  {
    type: 'the_gauntlet',
    title: 'The Gauntlet',
    description: 'Complete 3 quests in a row without closing the app. No breaks. No mercy.',
    condition: 'Complete 3 quests consecutively',
    baseXP: 100,
    rewardMessage: 'The Gauntlet cleared. 100 bonus XP. You are Relentless.',
    extraReward: 'Relentless',
    excludeRecovery: true,
  },
  {
    type: 'phantom_outreach',
    title: 'Phantom Outreach',
    description: 'Send 5 cold outreach messages RIGHT NOW, outside your planned schedule.',
    condition: 'Send 5 cold outreach messages immediately',
    baseXP: 75,
    rewardMessage: 'Outreach executed from the shadows. +75 XP. Sales stat recalibrated.',
    excludeRecovery: true,
  },
  {
    type: 'mirror_quest',
    title: 'Mirror Quest',
    description: 'The System sees what you avoid. Complete the quest you\'ve been dodging the longest.',
    condition: 'Complete your most-avoided quest',
    baseXP: 0, // 2x on the avoided quest
    rewardMessage: 'Mirror shattered. Resistance score reduced. The System acknowledges your growth.',
  },
  {
    type: 'stealth_recovery',
    title: 'Stealth Recovery',
    description: 'The shadows offer healing: Complete a 10-minute meditation or breathing exercise.',
    condition: 'Complete a 10-minute meditation or breathwork',
    baseXP: 50,
    rewardMessage: 'Recovery accepted. +50 XP. Mood boost logged. Even shadows rest.',
    recoveryOnly: true,
  },
  {
    type: 'time_warp',
    title: 'Time Warp',
    description: 'Complete tomorrow\'s pre-committed quest TODAY instead. Seize the future.',
    condition: 'Complete tomorrow\'s pre-committed quest now',
    baseXP: 0, // 2x on the pre-committed quest
    rewardMessage: 'Time bent to your will. Quest XP doubled. Ahead of schedule.',
    extraReward: 'Ahead of Schedule',
    excludeRecovery: true,
  },
  {
    type: 'monarchs_challenge',
    title: "The Monarch's Challenge",
    description: 'Complete every remaining quest for today. ALL of them. No exceptions.',
    condition: 'Complete all remaining quests today',
    baseXP: 200,
    rewardMessage: 'Every quest. Every shadow conquered. +200 XP. Title granted: Shadow Commander.',
    extraReward: 'Shadow Commander',
    excludeRecovery: true,
  },
];

// ── Persistence ──────────────────────────────────────────────────────

function loadState(): ShadowQuestState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state: ShadowQuestState = JSON.parse(raw);
      const today = new Date().toISOString().split('T')[0];
      if (state.today === today) return state;
    }
  } catch { /* ignore */ }
  return createFreshState();
}

function createFreshState(): ShadowQuestState {
  return {
    today: new Date().toISOString().split('T')[0],
    quest: null,
    triggered: false,
    completionsToday: 0,
    stats: loadStats(),
  };
}

function saveState(state: ShadowQuestState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadStats(): ShadowQuestStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state: ShadowQuestState = JSON.parse(raw);
      if (state.stats) return state.stats;
    }
  } catch { /* ignore */ }
  return {
    totalGenerated: 0,
    totalCompleted: 0,
    totalExpired: 0,
    completionRate: 0.5,
    difficultyModifier: 1.0,
  };
}

// ── Core Logic ───────────────────────────────────────────────────────

/**
 * Attempt to generate a shadow quest for today.
 * Returns the quest if one activates, null otherwise.
 * Should be called on app load.
 */
export function rollForShadowQuest(
  mode: 'push' | 'steady' | 'recovery',
  resistanceData: ResistanceAnalysis | null,
): ShadowQuestState {
  const state = loadState();

  // Already have a quest for today (generated or not)
  if (state.quest !== null) return state;

  // Roll probability based on mode
  const chances: Record<string, number> = { push: 0.25, steady: 0.15, recovery: 0.10 };
  const roll = Math.random();
  if (roll > (chances[mode] ?? 0.15)) {
    // No shadow quest today
    saveState(state);
    return state;
  }

  // Pick a quest type
  const isRecovery = mode === 'recovery';
  let candidates = SHADOW_QUEST_TEMPLATES.filter(t => {
    if (t.recoveryOnly && !isRecovery) return false;
    if (t.excludeRecovery && isRecovery) return false;
    return true;
  });

  // If no resistance data, exclude mirror_quest
  if (!resistanceData || resistanceData.hardAvoidanceQuests.length === 0) {
    candidates = candidates.filter(t => t.type !== 'mirror_quest');
  }

  if (candidates.length === 0) {
    saveState(state);
    return state;
  }

  const template = candidates[Math.floor(Math.random() * candidates.length)];

  // Apply difficulty modifier from stats
  const diffMod = state.stats.difficultyModifier;
  const adjustedXP = template.baseXP > 0
    ? Math.round(template.baseXP * diffMod)
    : template.baseXP;

  // Variable reward with boosted 50% odds
  const variableReward = Math.random() < 0.5
    ? { isActive: true, multiplier: Math.round((1.5 + Math.random() * 3.5) * 10) / 10, revealMessage: null as string | null }
    : { isActive: false, multiplier: null, revealMessage: null };

  if (variableReward.isActive && variableReward.multiplier) {
    const bonusXP = Math.round(adjustedXP * variableReward.multiplier) - adjustedXP;
    const msgs = [
      `Shadow bonus unlocked. ${variableReward.multiplier}x applied.`,
      `Hidden power detected. +${bonusXP} bonus XP.`,
      `The shadows reward the worthy. ${variableReward.multiplier}x multiplier.`,
    ];
    variableReward.revealMessage = msgs[Math.floor(Math.random() * msgs.length)];
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

  const mirrorQuestId = template.type === 'mirror_quest' && resistanceData?.hardAvoidanceQuests[0]
    ? resistanceData.hardAvoidanceQuests[0].questId
    : undefined;

  const quest: ShadowQuest = {
    id: `shadow-${now.getTime()}`,
    type: template.type,
    title: template.title,
    description: template.description,
    condition: template.condition,
    rewardXP: adjustedXP,
    rewardMessage: template.rewardMessage,
    expiresAt: expiry.toISOString(),
    activatedAt: now.toISOString(),
    completed: false,
    expired: false,
    variableReward: variableReward as VariableReward,
    extraReward: template.extraReward,
    mirrorQuestId,
  };

  state.quest = quest;
  state.stats.totalGenerated++;
  saveState(state);
  return state;
}

/**
 * Call when a calibrated quest is completed. Increments counter and
 * returns true when the shadow quest notification should appear (at 2nd completion).
 */
export function onQuestCompleted(): { shouldNotify: boolean; state: ShadowQuestState } {
  const state = loadState();
  if (!state.quest || state.triggered) {
    state.completionsToday++;
    saveState(state);
    return { shouldNotify: false, state };
  }

  state.completionsToday++;

  if (state.completionsToday >= 2 && !state.triggered) {
    state.triggered = true;
    saveState(state);
    return { shouldNotify: true, state };
  }

  saveState(state);
  return { shouldNotify: false, state };
}

/**
 * Mark the shadow quest as completed.
 */
export function completeShadowQuest(): ShadowQuestState {
  const state = loadState();
  if (!state.quest) return state;

  state.quest.completed = true;
  state.stats.totalCompleted++;
  state.stats.completionRate = state.stats.totalGenerated > 0
    ? state.stats.totalCompleted / state.stats.totalGenerated
    : 0.5;

  // Adjust difficulty based on completion rate
  if (state.stats.completionRate > 0.7 && state.stats.totalGenerated >= 5) {
    state.stats.difficultyModifier = Math.min(2.0, state.stats.difficultyModifier + 0.1);
  } else if (state.stats.completionRate < 0.3 && state.stats.totalGenerated >= 5) {
    state.stats.difficultyModifier = Math.max(0.7, state.stats.difficultyModifier - 0.1);
  }

  saveState(state);
  return state;
}

/**
 * Check if the shadow quest has expired.
 */
export function checkShadowExpiry(): ShadowQuestState {
  const state = loadState();
  if (!state.quest || state.quest.completed || state.quest.expired) return state;

  if (new Date() >= new Date(state.quest.expiresAt)) {
    state.quest.expired = true;
    state.stats.totalExpired++;
    state.stats.completionRate = state.stats.totalGenerated > 0
      ? state.stats.totalCompleted / state.stats.totalGenerated
      : 0.5;

    // Make easier if low completion
    if (state.stats.completionRate < 0.3 && state.stats.totalGenerated >= 5) {
      state.stats.difficultyModifier = Math.max(0.7, state.stats.difficultyModifier - 0.1);
    }

    saveState(state);
  }
  return state;
}

/**
 * Get time remaining on active shadow quest.
 */
export function getShadowTimeRemaining(quest: ShadowQuest): { minutes: number; seconds: number } | null {
  if (quest.completed || quest.expired) return null;
  const diff = new Date(quest.expiresAt).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    minutes: Math.floor(diff / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/** Get the current shadow quest state (read-only). */
export function getShadowState(): ShadowQuestState {
  return loadState();
}
