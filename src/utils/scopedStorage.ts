/**
 * Scoped localStorage — prefixes keys with user ID to prevent
 * data collision when multiple accounts use the same device.
 */

const SCOPE_UID_KEY = '__storage_scope_uid';

let currentUserId: string | null = null;

// Initialize synchronously from cache so hooks can read scoped keys on first render
try {
  currentUserId = localStorage.getItem(SCOPE_UID_KEY);
} catch { /* ignore */ }

/** Call from AuthContext when user changes */
export function setStorageScope(userId: string | null) {
  const previousUserId = currentUserId;
  currentUserId = userId;

  if (userId) {
    localStorage.setItem(SCOPE_UID_KEY, userId);
    // Migrate old unscoped keys to scoped keys on first login
    if (previousUserId !== userId) {
      migrateUnscopedKeys(userId);
    }
  } else {
    localStorage.removeItem(SCOPE_UID_KEY);
  }
}

/** Returns user-scoped key, or bare key if no user */
export function storageKey(key: string): string {
  return currentUserId ? `user_${currentUserId}_${key}` : key;
}

export function getStorageScope(): string | null {
  return currentUserId;
}

// ── Migration ────────────────────────────────────────────────────────

const SYSTEM_STORAGE_KEYS = [
  'the-system-player',
  'the-system-quests',
  'the-system-protocol-quests',
  'the-system-main-quests',
  'the-system-history',
  'the-system-daily-xp',
  'the-system-pillar-quests',
  'the-system-pillar-streaks',
  'the-system-workout',
  'the-system-caffeine',
  'the-system-inventory',
  'the-system-loot',
  'systemActivated',
  'systemStartDate',
  'systemStateHistory',
  'systemLastScanDate',
  'systemDayCycle',
  'systemGeneticHUD',
  'systemSprintTimer',
  'systemFocusMode',
  'systemFocusModeActive',
  'systemPreCommitment',
  'systemPreCommitTriggerDate',
  'systemCalibratedCompletions',
  'systemCompletionHistory',
  'systemResistanceData',
  'systemPersuasionProfile',
  'systemPersuasionOutcomes',
  'systemPersuasionOptimizer',
  'systemShadowQuest',
  'systemCommsState',
  'systemWeeklyPlan',
  'systemWeeklyPlanDismissed',
  'systemResistancePrevScore',
  'systemMuscleRecovery',
  'systemAISettings',
  'systemAIQuests',
  'systemCurrency',
  'systemCurrencyTransactions',
  'systemLastLoginDate',
  'systemAIIntelligence',
  'jarvisAnticipations',
  'jarvisSynthesizedInsights',
  'jarvisUserLearning',
  'systemCornerstone',
  'systemNarrativeLoops',
  'systemAARHistory',
  'systemWeeklyAAR',
  'jarvisShadowFindings',
  'systemSkills',
  'systemSkillsShownUnlocks',
  'systemInventoryItems',
  'systemActiveBoosts',
  'systemAIPingResult',
];

/** One-time migration: copy unscoped keys → scoped keys */
function migrateUnscopedKeys(userId: string) {
  const migrationFlag = `__migrated_scope_${userId}`;
  try {
    if (localStorage.getItem(migrationFlag)) return;

    for (const key of SYSTEM_STORAGE_KEYS) {
      const oldData = localStorage.getItem(key);
      const newKey = `user_${userId}_${key}`;
      const newData = localStorage.getItem(newKey);
      if (oldData && !newData) {
        localStorage.setItem(newKey, oldData);
      }
    }

    localStorage.setItem(migrationFlag, 'true');
  } catch { /* ignore */ }
}

/** Clear all scoped keys for the current user (call on sign-out) */
export function clearScopedStorage() {
  const prefix = currentUserId ? `user_${currentUserId}_` : null;

  for (const key of SYSTEM_STORAGE_KEYS) {
    localStorage.removeItem(key); // unscoped (legacy)
    if (prefix) localStorage.removeItem(`${prefix}${key}`); // scoped
  }

  // Clean up migration flags
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('the-system-migrated-') || k?.startsWith('__migrated_scope_')) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  localStorage.removeItem(SCOPE_UID_KEY);
}
